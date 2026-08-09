import { Notification, type INotification, type NotificationType } from '../models/notification.model'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Persists a notification to MongoDB with a 30-day TTL.
 * Called by the inapp worker before publishing to Redis pub/sub so that
 * users who reconnect can retrieve missed notifications from the DB.
 */
export async function persistNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data: Record<string, unknown> = {},
): Promise<INotification> {
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS)
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data,
    expiresAt,
  })
  return notification
}
