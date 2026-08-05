import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'

export type NotificationChannel = 'email' | 'push' | 'inapp'

export interface NotificationJob {
  channel: NotificationChannel
  template: string
  userId: string
  data: Record<string, unknown>
  notificationId: string
}

let notificationQueue: Queue<NotificationJob> | null = null

export function getNotificationQueue(redis: Redis): Queue<NotificationJob> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJob>('notifications', {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    })
  }
  return notificationQueue
}
