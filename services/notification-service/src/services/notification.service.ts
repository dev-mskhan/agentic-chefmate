import { Notification, type INotification, type NotificationType } from '../models/notification.model'
import type { Job, JobsOptions, Queue } from 'bullmq'
import type { NotificationJob } from '../queues/notification.queue'

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

export async function enqueueNotification(
  queue: Queue<NotificationJob>,
  name: string,
  job: NotificationJob,
  options?: JobsOptions,
): Promise<Job<NotificationJob>> {
  const { notificationId, userId, template, data } = job
  await Notification.findOneAndUpdate(
    { userId, 'data.notificationId': notificationId },
    {
      $setOnInsert: {
        userId,
        type: template as NotificationType,
        title: String(data['title'] ?? template),
        message: String(data['message'] ?? template),
        data: { ...data, notificationId },
        expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      },
      $set: { [`channelStatus.${job.channel}`]: { status: 'pending' } },
    },
    { upsert: true, setDefaultsOnInsert: true },
  )
  return queue.add(name, { ...job, data: { ...data, notificationId } }, {
    ...options,
    jobId: notificationId,
  })
}
