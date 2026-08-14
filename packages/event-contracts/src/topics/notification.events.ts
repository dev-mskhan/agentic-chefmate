export const NOTIFICATION_EVENTS_TOPIC = 'notification.events'

export type NotificationChannel = 'email' | 'push' | 'inapp'

export type NotificationEvent =
  | {
      type: 'notification.sent'
      notificationId: string
      userId: string
      channel: NotificationChannel
      template: string
      sentAt: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'notification.failed'
      notificationId: string
      userId: string
      channel: NotificationChannel
      template: string
      error: string
      /** True when retrying will never succeed (4xx, missing data, bad config). */
      isPermanent: boolean
      /** How many BullMQ attempts were made before this event was published. */
      attemptsMade: number
      /** The total attempts budget configured on the queue. */
      maxAttempts: number
      /** Full job payload — preserved so the DLQ can re-enqueue without data loss. */
      jobData: Record<string, unknown>
      createdAt: string
      version: '1'
    }
  | {
      type: 'notification.read'
      notificationId: string
      userId: string
      readAt: string
      createdAt: string
      version: '1'
    }
