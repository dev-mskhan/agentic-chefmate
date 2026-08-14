import { Worker } from 'bullmq'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { PushSubscription } from '../models/push-subscription.model'
import { sendWebPush } from '../services/web-push.service'
import { PermanentNotificationError } from '../utils/errors'
import { withCircuitBreaker } from '../utils/circuit-breaker'
import { config } from '../config'

const logger = createLogger('notification-push-worker')

export function startPushWorker(): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications-push',
    async (job) => {
      const { userId, template, notificationId, data } = job.data

      // Graceful dev fallback — no VAPID keys configured
      if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
        logger.warn({ userId, template }, 'VAPID keys not configured — skipping push notification')
        return
      }

      const subscriptions = await PushSubscription.find({ userId })

      if (subscriptions.length === 0) {
        logger.info({ userId, template }, 'No push subscriptions found for user — skipping')
        return
      }

      const payload = {
        notificationId,
        template,
        data,
        sentAt: new Date().toISOString(),
      }

      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            // Circuit breaker wraps the entire Web Push API call.
            // Opens after 5 consecutive failures — prevents flooding the Push
            // API and preserves retry budget for when the service recovers.
            await withCircuitBreaker('web-push', () =>
              sendWebPush({ endpoint: sub.endpoint, keys: sub.keys }, payload),
            )
          } catch (err: unknown) {
            const status = (err as { statusCode?: number })?.statusCode

            // 410 Gone / 404 Not Found — subscription expired, clean up silently
            if (status === 410 || status === 404) {
              logger.info(
                { endpoint: sub.endpoint, userId: sub.userId },
                'Push subscription expired — removing from DB',
              )
              await PushSubscription.deleteOne({ _id: sub._id })
              return // not a delivery error
            }

            // 4xx (except 410/404) — bad request, retrying won't help
            if (status !== undefined && status >= 400 && status < 500) {
              throw new PermanentNotificationError(
                `Push API returned permanent error ${status} for endpoint ${sub.endpoint}`,
              )
            }

            // 5xx / network — re-throw for BullMQ to retry
            throw err
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
        { userId, template, notificationId, subscriptionCount: subscriptions.length },
        'Push notification delivered',
      )
    },
    {
      connection:  getBullMQConnection(),
      concurrency: 20,
    },
  )
}
