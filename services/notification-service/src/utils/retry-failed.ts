import { Queue } from 'bullmq'
import { getBullMQConnection } from '../queues/redis-connection'
import type { NotificationJob } from '../queues/notification.queue'
import { DLQEntry } from '../models/dead-letter-queue.model'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-dlq-reprocessor')

const QUEUE_NAMES: Record<string, string> = {
  email: 'notifications-email',
  push:  'notifications-push',
  inapp: 'notifications-inapp',
}

/**
 * Reprocesses pending DLQ entries by re-enqueueing their saved job payload.
 *
 * - Skips entries with `isPermanent: true` — these require manual investigation.
 * - Uses a fresh jobId (appends `:retry:{timestamp}`) so BullMQ deduplication
 *   doesn't block the retry attempt.
 * - Marks each entry as 'reprocessed' on success.
 *
 * Safe to call from a cron job, a Node REPL, or an admin HTTP endpoint.
 *
 * @param channel   Optional filter — reprocess only one channel's failures.
 * @param reprocessedBy  Label for the audit trail ('auto', 'admin:userId', etc.)
 * @param limit     Max number of entries to process in one run (default: 100)
 */
export async function reprocessDLQ(
  channel?: 'email' | 'push' | 'inapp',
  reprocessedBy = 'auto',
  limit = 100,
): Promise<{ reprocessed: number; skipped: number }> {
  const filter = {
    status:      'pending',
    isPermanent: false,
    ...(channel ? { channel } : {}),
  }

  const entries = await DLQEntry.find(filter)
    .sort({ failedAt: 1 }) // oldest first
    .limit(limit)

  let reprocessed = 0
  let skipped = 0

  for (const entry of entries) {
    const queueName = QUEUE_NAMES[entry.channel]
    if (!queueName) {
      logger.warn({ channel: entry.channel, notificationId: entry.notificationId }, 'Unknown channel in DLQ entry — skipping')
      skipped++
      continue
    }

    const queue = new Queue<NotificationJob>(queueName, { connection: getBullMQConnection() })

    try {
      // Fresh jobId — BullMQ would silently drop a duplicate jobId
      const retryJobId = `${entry.notificationId}:retry:${Date.now()}`
      await queue.add('send-notification', entry.jobData, { jobId: retryJobId })

      await DLQEntry.findByIdAndUpdate(entry._id, {
        status:        'reprocessed',
        reprocessedAt: new Date(),
        reprocessedBy,
      })

      reprocessed++
      logger.info(
        { notificationId: entry.notificationId, channel: entry.channel, retryJobId },
        'DLQ entry re-enqueued',
      )
    } catch (err) {
      logger.error(
        { err, notificationId: entry.notificationId },
        'Failed to re-enqueue DLQ entry',
      )
      skipped++
    } finally {
      await queue.close()
    }
  }

  logger.info({ reprocessed, skipped, total: entries.length }, 'DLQ reprocess run complete')
  return { reprocessed, skipped }
}

/**
 * Marks a DLQ entry as 'abandoned' — used for permanent failures or entries
 * that have been manually investigated and confirmed non-deliverable.
 */
export async function abandonDLQEntry(
  notificationId: string,
  abandonedBy = 'admin',
): Promise<boolean> {
  const result = await DLQEntry.findOneAndUpdate(
    { notificationId, status: 'pending' },
    { status: 'abandoned', reprocessedAt: new Date(), reprocessedBy: abandonedBy },
  )
  return result !== null
}
