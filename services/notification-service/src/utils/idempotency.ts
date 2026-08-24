import crypto from 'crypto'

/**
 * Derives a deterministic notification ID from an event type and identifying parts.
 * Using the same inputs always produces the same ID, so Kafka re-deliveries
 * are safely deduplicated when passed as BullMQ jobId.
 */
export function deriveNotificationId(eventType: string, ...parts: string[]): string {
  const normalizedParts = parts.at(-1) && ['email', 'push', 'inapp'].includes(parts.at(-1)!)
    ? parts.slice(0, -1)
    : parts
  return crypto
    .createHash('sha256')
    .update([eventType, ...normalizedParts].join(':'))
    .digest('hex')
    .slice(0, 32)
}
