import { Worker } from 'bullmq'
import nodemailer from 'nodemailer'
import { config } from '../config'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { createLogger } from '@chefmate/logger'
import { PermanentNotificationError } from '../utils/errors'
import { withCircuitBreaker } from '../utils/circuit-breaker'
import { verifyEmailTemplate } from '../templates/email/verify-email'
import { resetPasswordTemplate } from '../templates/email/reset-password'
import { welcomeChefTemplate } from '../templates/email/welcome-chef'
import { newOrderChefTemplate } from '../templates/email/new-order-chef'
import { orderConfirmedUserTemplate } from '../templates/email/order-confirmed-user'
import { leaveReviewTemplate } from '../templates/email/leave-review'
import { paymentConfirmedTemplate } from '../templates/email/payment-confirmed'
import { paymentFailedTemplate }    from '../templates/email/payment-failed'
import { subscriptionActivatedTemplate } from '../templates/email/subscription-activated'
import { subscriptionCancelledTemplate }  from '../templates/email/subscription-cancelled'
import { subscriptionPastDueTemplate }    from '../templates/email/subscription-past-due'

const logger = createLogger('notification-email-worker')

// ── Nodemailer transporter (Gmail SMTP via App Password) ──────────────────────

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   config.SMTP_HOST,
      port:   config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    })
  }
  return transporter
}

// ── Template renderer ─────────────────────────────────────────────────────────

function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): { subject: string; html: string; text: string } | null {
  switch (template) {
    case 'verify-email':
      return verifyEmailTemplate({
        email:     data['email'] as string,
        verifyUrl: data['verifyUrl'] as string,
      })

    case 'reset-password':
      return resetPasswordTemplate({
        email:    data['email'] as string,
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

    case 'payment-confirmed':
      return paymentConfirmedTemplate(data as unknown as Parameters<typeof paymentConfirmedTemplate>[0])

    case 'payment-failed':
      return paymentFailedTemplate(data as unknown as Parameters<typeof paymentFailedTemplate>[0])

    case 'subscription-activated':
      return subscriptionActivatedTemplate(data as unknown as Parameters<typeof subscriptionActivatedTemplate>[0])
    case 'subscription-cancelled':
      return subscriptionCancelledTemplate(data as unknown as Parameters<typeof subscriptionCancelledTemplate>[0])
    case 'subscription-past-due':
      return subscriptionPastDueTemplate(data as unknown as Parameters<typeof subscriptionPastDueTemplate>[0])

    default:
      return null
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startEmailWorker(): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications-email',
    async (job) => {
      const { template, data, notificationId, userId } = job.data

      // ── Validate recipient ─────────────────────────────────────────────────
      // The email address must be present in job data. If it's missing, this
      // is a permanent data error — retrying will never produce the email.
      const toEmail = data['email'] as string | undefined
      if (!toEmail) {
        throw new PermanentNotificationError(
          `No email address in job data for template '${template}' (userId: ${userId}). ` +
          `Ensure the consumer passes data.email when enqueuing email jobs.`,
        )
      }

      // ── Render template ────────────────────────────────────────────────────
      const rendered = renderTemplate(template, data)
      if (!rendered) {
        // Unknown template — permanent error, retrying won't help
        throw new PermanentNotificationError(`No renderer found for email template: '${template}'`)
      }

      logger.info(
        { to: toEmail, template, notificationId },
        'Sending email via Gmail SMTP',
      )

      // ── Send (wrapped in circuit breaker) ─────────────────────────────────
      // If SMTP is down, the circuit opens after 5 consecutive failures.
      // Subsequent jobs fail immediately instead of waiting for SMTP timeout,
      // preserving their retry budget for when SMTP recovers.
      await withCircuitBreaker('smtp', () =>
        getTransporter().sendMail({
          from:    `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
          to:      toEmail,
          subject: rendered.subject,
          html:    rendered.html,
          text:    rendered.text,
        }),
      )
    },
    {
      connection:  getBullMQConnection(),
      concurrency: 5,
    },
  )
}

