import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { config } from '../config'
import type { NotificationJob } from '../queues/notification.queue'
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
 * Returns null for templates that don't need an email (e.g. push-only).
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
      return newOrderChefTemplate(data as Parameters<typeof newOrderChefTemplate>[0])

    case 'order-confirmed-user':
      return orderConfirmedUserTemplate(
        data as Parameters<typeof orderConfirmedUserTemplate>[0],
      )

    case 'leave-review':
      return leaveReviewTemplate(data as Parameters<typeof leaveReviewTemplate>[0])

    default:
      return null
  }
}

export function startEmailWorker(redis: Redis): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'email') return

      const sg = getSendGrid()
      if (!sg) {
        logger.warn({ template: job.data.template }, 'SendGrid not configured — skipping email')
        return
      }

      // The job data carries the recipient email directly for auth events
      // (verify-email, reset-password). For other templates the email is
      // resolved from data or falls back to a user-service lookup (TODO).
      const toEmail = (job.data.data['email'] as string | undefined)
      if (!toEmail) {
        logger.warn(
          { userId: job.data.userId, template: job.data.template },
          'No email address in job data — skipping',
        )
        return
      }

      const rendered = renderTemplate(job.data.template, job.data.data)
      if (!rendered) {
        logger.warn({ template: job.data.template }, 'No renderer for template — skipping')
        return
      }

      logger.info(
        {
          to: toEmail,
          template: job.data.template,
          notificationId: job.data.notificationId,
        },
        'Sending email',
      )

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
      connection: redis,
      concurrency: 10,
    },
  )
}
