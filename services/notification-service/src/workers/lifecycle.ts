import type { Worker } from 'bullmq'
import type { NotificationJob } from '../queues/notification.queue'
import { publishNotificationEvent } from '../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-worker-lifecycle')

/**
 * Attaches BullMQ completed/failed listeners to a worker so that
 * notification.sent / notification.failed events are published back
 * to Redpanda after every job outcome.
 */
export function attachWorkerLifecycle(worker: Worker<NotificationJob>): void {
  worker.on('completed', (job) => {
    void publishNotificationEvent({
      type: 'notification.sent',
      notificationId: job.data.notificationId,
      userId: job.data.userId,
      channel: job.data.channel,
      template: job.data.template,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: '1',
    })
  })

  worker.on('failed', (job, err) => {
    if (!job) return
    logger.error({ err, notificationId: job.data.notificationId }, 'Notification job failed')
    void publishNotificationEvent({
      type: 'notification.failed',
      notificationId: job.data.notificationId,
      userId: job.data.userId,
      channel: job.data.channel,
      template: job.data.template,
      error: err.message,
      createdAt: new Date().toISOString(),
      version: '1',
    })
  })
}
