import { Worker } from 'bullmq'
import { config } from '../config'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { createLogger } from '@chefmate/logger'
import { verifyEmailTemplate } from '../templates/email/verify-email'
import { resetPasswordTemplate } from '../templates/email/reset-password'
import { welcomeChefTemplate } from '../templates/email/welcome-chef'
import { newOrderChefTemplate } from '../templates/email/new-order-chef'
import { orderConfirmedUserTemplate } from '../templates/email/order-confirmed-user'
import { leaveReviewTemplate } from '../templates/email/leave-review'

const logger = createLogger('notification-email-worker')

interface SendGridClient {
  send(msg: object): Promise<void>
}

// Lazily initialise SendGrid to avoid crashing if key not set in dev
function getSendGrid(): SendGridClient | null {
  if (!config.SENDGRID_API_KEY) {
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sgMail = require('@sendgrid/mail') as SendGridClient & {
    setApiKey(key: string): void
  }
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  return sgMail
}

/**
 * Render a template into { subject, html, text } given the job's data payload.
 * Returns null for unrecognised templates.
 */
function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): { subject: string; html: string; text: string } | null {
  switch (template) {
    case 'verify-email':
      return verifyEmailTemplate({
        email: data['email'] as string,
        verifyUrl: data['verifyUrl'] as string,
      })

    case 'reset-password':
      return resetPasswordTemplate({
        email: data['email'] as string,
        resetUrl: data['resetUrl'] as string,
      })

    case 'welcome-chef':
      return welcomeChefTemplate()

    case 'new-order-chef':
      return newOrderChefTemplate(data as unknown as Parameters<typeof newOrderChefTemplate>[0])

    case 'order-confirmed-user':
      return orderConfirmedUserTemplate(
        data as unknown as Parameters<typeof orderConfirmedUserTemplate>[0],
      )

    case 'leave-review':
      return leaveReviewTemplate(data as unknown as Parameters<typeof leaveReviewTemplate>[0])

    default:
      return null
  }
}

export function startEmailWorker(): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'email') return

      const sg = getSendGrid()
      if (!sg) {
        throw new Error('SendGrid not configured')
      }

      const toEmail = job.data.data['email'] as string | undefined
      if (!toEmail) {
        throw new Error(`No email in job data for template ${job.data.template}`)
      }

      const rendered = renderTemplate(job.data.template, job.data.data)
      if (!rendered) {
        throw new Error(`No renderer for template: ${job.data.template}`)
      }

      logger.info(
        {
          to: toEmail,
          template: job.data.template,
          notificationId: job.data.notificationId,
        },
        'Sending email',
      )

      // sg.send throws on failure — let it propagate so BullMQ retries
      await sg.send({
        to: toEmail,
        from: {
          email: config.SENDGRID_FROM_EMAIL,
          name: config.SENDGRID_FROM_NAME,
        },
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
    },
    {
      connection: getBullMQConnection(),
      concurrency: 10,
    },
  )
}
