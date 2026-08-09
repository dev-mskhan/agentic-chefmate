import { Worker } from 'bullmq'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { PushSubscription } from '../models/push-subscription.model'
import { sendWebPush } from '../services/web-push.service'
import { config } from '../config'

const logger = createLogger('notification-push-worker')

export function startPushWorker(): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'push') return

      // Graceful dev fallback — no VAPID keys configured
      if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
        logger.warn(
          { userId: job.data.userId, template: job.data.template },
          'VAPID keys not configured — skipping push notification',
        )
        return
      }

      const subscriptions = await PushSubscription.find({ userId: job.data.userId })

      if (subscriptions.length === 0) {
        logger.info(
          { userId: job.data.userId, template: job.data.template },
          'No push subscriptions found for user — skipping',
        )
        return
      }

      const payload = {
        notificationId: job.data.notificationId,
        template: job.data.template,
        data: job.data.data,
        sentAt: new Date().toISOString(),
      }

      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await sendWebPush(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload,
            )
          } catch (err: unknown) {
            // 410 Gone or 404 Not Found — subscription has expired, clean it up
            const status = (err as { statusCode?: number })?.statusCode
            if (status === 410 || status === 404) {
              logger.info(
                { endpoint: sub.endpoint, userId: sub.userId },
                'Push subscription expired — removing from DB',
              )
              await PushSubscription.deleteOne({ _id: sub._id })
              return // not a fatal error
            }
            throw err // re-throw for BullMQ to retry
          }
        }),
      )

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        const reasons = failed
          .map((r) => (r as PromiseRejectedResult).reason as unknown)
          .map((r) => (r instanceof Error ? r.message : String(r)))
          .join(', ')
        throw new Error(`Push delivery failed for ${failed.length} subscription(s): ${reasons}`)
      }

      logger.info(
        {
          userId: job.data.userId,
          template: job.data.template,
          notificationId: job.data.notificationId,
          subscriptionCount: subscriptions.length,
        },
        'Push notification delivered',
      )
    },
    {
      connection: getBullMQConnection(),
      concurrency: 20,
    },
  )
}
