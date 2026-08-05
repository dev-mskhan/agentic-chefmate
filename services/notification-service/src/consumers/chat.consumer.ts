import type { Queue } from 'bullmq'
import type { ChatEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import crypto from 'crypto'

export async function handleChatEvent(
  event: ChatEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  if (event.type === 'chat.message_unread') {
    await queue.add('send-notification', {
      channel: 'push',
      template: 'unread-message',
      userId: event.recipientId,
      notificationId: crypto.randomUUID(),
      data: {
        messageId: event.messageId,
        threadId: event.threadId,
        senderId: event.senderId,
      },
    })
  }
}
