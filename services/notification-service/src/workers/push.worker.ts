import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'

const logger = createLogger('notification-push-worker')

export function startPushWorker(redis: Redis): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'push') return

      logger.info(
        {
          userId: job.data.userId,
          template: job.data.template,
          notificationId: job.data.notificationId,
        },
        'Sending push notification',
      )
      // TODO: resolve FCM token for userId and send via firebase-admin
    },
    {
      connection: redis,
      concurrency: 20,
    },
  )
}
