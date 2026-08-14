import { Queue } from 'bullmq'
import { getBullMQConnection } from './redis-connection'

export type NotificationChannel = 'email' | 'push' | 'inapp'

export interface NotificationJob {
  channel: NotificationChannel
  template: string
  userId: string
  data: Record<string, unknown>
  notificationId: string
}

// ── Per-channel queues ────────────────────────────────────────────────────────
// Separate queues give each channel:
//  • Independent scaling (concurrency, workers)
//  • Independent retry budgets
//  • Isolated metrics in Bull-Board / BullMQ dashboard
//  • No wasted poll cycles from channel-mismatch skips on a shared queue

let emailQueue: Queue<NotificationJob> | null = null
let pushQueue:  Queue<NotificationJob> | null = null
let inappQueue: Queue<NotificationJob> | null = null

export function getEmailQueue(): Queue<NotificationJob> {
  if (!emailQueue) {
    emailQueue = new Queue<NotificationJob>('notifications-email', {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s, 16s, 32s
        removeOnComplete: { count: 200, age: 3600 },
        // Keep ALL failed jobs — the DLQ consumer handles durable storage.
        // removeOnFail: false means the failed set grows unbounded in Redis,
        // so we cap it at a generous 1000 for operational safety.
        removeOnFail: { count: 1000 },
      },
    })
  }
  return emailQueue
}

export function getPushQueue(): Queue<NotificationJob> {
  if (!pushQueue) {
    pushQueue = new Queue<NotificationJob>('notifications-push', {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        // Push is best-effort — fewer retries, faster promotion to DLQ
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    })
  }
  return pushQueue
}

export function getInAppQueue(): Queue<NotificationJob> {
  if (!inappQueue) {
    inappQueue = new Queue<NotificationJob>('notifications-inapp', {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        // In-app is critical for UX — more attempts, shorter delay
        attempts: 10,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      },
    })
  }
  return inappQueue
}

/** Convenience: close all queues on graceful shutdown. */
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    emailQueue?.close(),
    pushQueue?.close(),
    inappQueue?.close(),
  ])
}
