import type { Worker, Job } from 'bullmq'
import type { NotificationJob } from '../queues/notification.queue'
import { publishNotificationEvent } from '../services/event.service'
import { Notification } from '../models/notification.model'
import { isPermanentError } from '../utils/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-worker-lifecycle')

/** Max attempts budget per channel queue — must stay in sync with queue config. */
const MAX_ATTEMPTS: Record<string, number> = {
  email: 5,
  push:  3,
  inapp: 10,
}

/**
 * Attaches BullMQ `completed` / `failed` listeners to a worker.
 *
 * On completion:
 *  - Updates the Notification document status to 'delivered'
 *  - Publishes `notification.sent` to Kafka
 *
 * On failure:
 *  - Classifies the error as permanent or transient
 *  - Updates the Notification document status to 'failed' (final failures only)
 *  - Publishes `notification.failed` to Kafka with full metadata for the DLQ consumer
 *
 * Note: with per-channel queues, each worker only receives jobs for its own
 * channel, so the channel mismatch guard from the old shared queue is no
 * longer needed.
 */
export function attachWorkerLifecycle(
  worker: Worker<NotificationJob>,
  channel: 'email' | 'push' | 'inapp',
): void {
  // ── Completed ─────────────────────────────────────────────────────────────
  worker.on('completed', (job: Job<NotificationJob>) => {
    const { notificationId, userId, template } = job.data

    // Update delivery status in MongoDB (fire-and-forget — don't block the worker)
    void Notification.findOneAndUpdate(
      { userId, 'data.notificationId': notificationId },
      { status: 'delivered', deliveredAt: new Date() },
    ).catch((err) =>
      logger.error({ err, notificationId }, 'Failed to update notification status to delivered'),
    )

    void publishNotificationEvent({
      type: 'notification.sent',
      notificationId,
      userId,
      channel,
      template,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: '1',
    })
  })

  // ── Failed ────────────────────────────────────────────────────────────────
  worker.on('failed', (job: Job<NotificationJob> | undefined, err: Error) => {
    if (!job) return

    const { notificationId, userId, channel: jobChannel, template } = job.data
    const permanent    = isPermanentError(err)
    const maxAttempts  = MAX_ATTEMPTS[channel] ?? 5
    const isFinal      = permanent || job.attemptsMade >= maxAttempts

    logger.error(
      { err, notificationId, channel, template, attemptsMade: job.attemptsMade, isFinal, permanent },
      'Notification job failed',
    )

    // Update Notification status only on the final failure — intermediate
    // retry failures are noise; we don't want to mark delivered notifications
    // as failed just because a parallel channel attempt is retrying.
    if (isFinal) {
      void Notification.findOneAndUpdate(
        { userId, 'data.notificationId': notificationId },
        { status: 'failed', failedReason: err.message },
      ).catch((dbErr) =>
        logger.error({ dbErr, notificationId }, 'Failed to update notification status to failed'),
      )
    }

    void publishNotificationEvent({
      type:           'notification.failed',
      notificationId,
      userId,
      channel:        jobChannel,
      template,
      error:          err.message,
      isPermanent:    permanent,
      attemptsMade:   job.attemptsMade,
      maxAttempts,
      // Preserve the full job payload so the DLQ consumer can re-enqueue it
      jobData:        job.data as unknown as Record<string, unknown>,
      createdAt:      new Date().toISOString(),
      version:        '1',
    })
  })
}
