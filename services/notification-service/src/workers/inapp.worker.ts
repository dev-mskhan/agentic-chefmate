import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'

const logger = createLogger('notification-inapp-worker')

export function startInAppWorker(redis: Redis, pubClient: Redis): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'inapp') return

      const channel = `notif:inapp:${job.data.userId}`
      const payload = JSON.stringify({
        notificationId: job.data.notificationId,
        template: job.data.template,
        data: job.data.data,
        sentAt: new Date().toISOString(),
      })

      await pubClient.publish(channel, payload)
      logger.info({ channel, template: job.data.template }, 'In-app notification published')
    },
    {
      connection: redis,
      concurrency: 50,
    },
  )
}
