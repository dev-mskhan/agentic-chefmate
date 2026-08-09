import type { Queue } from 'bullmq'
import type { ChatEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'

export async function handleChatEvent(
  event: ChatEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  if (event.type === 'chat.message_unread') {
    const pushId  = deriveNotificationId('chat.message_unread', event.messageId, 'push')
    const inappId = deriveNotificationId('chat.message_unread', event.messageId, 'inapp')

    // Push notification
    await queue.add(
      'send-notification',
      {
        channel: 'push',
        template: 'unread-message',
        userId: event.recipientId,
        notificationId: pushId,
        data: {
          messageId: event.messageId,
          threadId: event.threadId,
          senderId: event.senderId,
        },
      },
      { jobId: pushId },
    )

    // In-app notification (persisted to MongoDB)
    await queue.add(
      'send-notification',
      {
        channel: 'inapp',
        template: 'unread-message',
        userId: event.recipientId,
        notificationId: inappId,
        data: {
          messageId: event.messageId,
          threadId: event.threadId,
          senderId: event.senderId,
        },
      },
      { jobId: inappId },
    )
  }
}
