import type { NotificationEvent } from '@chefmate/event-contracts'
import { DLQEntry } from '../models/dead-letter-queue.model'
import { sendAlert } from '../services/alert.service'
import { incrementFailureCounter } from '../utils/circuit-breaker'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-failure-consumer')

// Alert thresholds per channel — tune to your error budget
const ALERT_THRESHOLDS: Record<string, number> = {
  email: 5,
  push:  10,
  inapp: 3,
}
const DEFAULT_THRESHOLD = 5

/**
 * Consumes `notification.failed` events published by lifecycle.ts.
 *
 * Responsibilities (in order):
 *  1. Write to DLQ when the job is permanently or finally failed
 *  2. Increment a Redis sliding-window failure counter (O(1), replaces countDocuments)
 *  3. Fire a Slack/PagerDuty alert when the per-channel threshold is breached
 */
export async function handleNotificationFailedEvent(
  event: NotificationEvent,
): Promise<void> {
  if (event.type !== 'notification.failed') return

  const { notificationId, userId, channel, template, error } = event
  const isPermanent   = event.isPermanent   ?? false
  const attemptsMade  = event.attemptsMade  ?? 1
  const maxAttempts   = event.maxAttempts   ?? 1
  const isFinalFailure = isPermanent || attemptsMade >= maxAttempts

  const now      = new Date()
  const dlqTTL   = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) // 180 days

  // ── 1. DLQ — only on final failure or permanent errors ────────────────────
  if (isFinalFailure) {
    try {
      await DLQEntry.findOneAndUpdate(
        { notificationId },
        {
          $setOnInsert: {
            notificationId,
            userId,
            channel,
            template,
            // Full job payload preserved for re-enqueuing
            jobData: event.jobData ?? {},
            error,
            isPermanent,
            attemptsMade,
            failedAt: now,
            status: 'pending',
            expiresAt: dlqTTL,
          },
        },
        { upsert: true },
      )
      logger.warn({ notificationId, channel, isPermanent }, 'Job written to DLQ')
    } catch (dlqErr) {
      // DLQ write failure must never crash the consumer.
      logger.error({ dlqErr, notificationId }, 'Failed to write DLQ entry')
    }
  }

  // ── 2. Redis sliding-window counter (O(1)) ─────────────────────────────────
  let recentCount = 0
  try {
    recentCount = await incrementFailureCounter(channel)
  } catch (counterErr) {
    logger.error({ counterErr, channel }, 'Failure counter Redis error — skipping alert check')
    return
  }

  // ── 3. Alert if threshold exceeded ────────────────────────────────────────
  const threshold = ALERT_THRESHOLDS[channel] ?? DEFAULT_THRESHOLD
  if (recentCount > threshold) {
    const severity = recentCount > threshold * 4 ? 'critical' : 'warning'
    await sendAlert({
      severity,
      title: `Notification failures spiking on ${channel}`,
      message:
        `${recentCount} ${channel} notification failures in the last 60 minutes. ` +
        (isFinalFailure
          ? `Latest failure written to DLQ (notificationId: ${notificationId}).`
          : `Retries still in progress.`),
      metadata: {
        channel,
        recentCount,
        threshold,
        notificationId,
        userId,
        template,
        error,
        isPermanent,
      },
    })
  }
}
