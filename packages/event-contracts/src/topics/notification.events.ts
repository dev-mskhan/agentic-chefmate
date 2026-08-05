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
