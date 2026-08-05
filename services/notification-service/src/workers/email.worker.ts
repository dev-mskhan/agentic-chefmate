import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { config } from '../config'
import type { NotificationJob } from '../queues/notification.queue'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-email-worker')

// Lazily initialise SendGrid to avoid crashing if key not set in dev
function getSendGrid() {
  if (!config.SENDGRID_API_KEY) {
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  return sgMail
}

const TEMPLATE_SUBJECTS: Record<string, string> = {
  'verify-email': 'Verify your Foodlancer email',
  'welcome-chef': "You're now a chef on Foodlancer!",
  'new-order-chef': 'You have a new order!',
  'order-confirmed-user': 'Your order is confirmed',
  'leave-review': 'How was your meal?',
  'order-cancelled': 'Your order was cancelled',
  'refund-issued': 'Your refund has been processed',
  'account-suspended': 'Important notice about your account',
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

      const subject = TEMPLATE_SUBJECTS[job.data.template] ?? 'Notification from Foodlancer'

      // In production, resolve userId → email via user-service HTTP call.
      // For now log the intent.
      logger.info(
        {
          userId: job.data.userId,
          template: job.data.template,
          notificationId: job.data.notificationId,
          subject,
        },
        'Sending email notification',
      )

      // TODO: resolve user email from user-service
      // await sg.send({ to: userEmail, from: { email: config.SENDGRID_FROM_EMAIL, name: config.SENDGRID_FROM_NAME }, subject, html: ... })
    },
    {
      connection: redis,
      concurrency: 10,
    },
  )
}
