import type { ChatEvent } from '@chefmate/event-contracts'
import { deriveNotificationId } from '../utils/idempotency'
import { getPushQueue, getInAppQueue } from '../queues/notification.queue'

export async function handleChatEvent(event: ChatEvent): Promise<void> {
  if (event.type !== 'chat.message_unread') return

  const pushQueue  = getPushQueue()
  const inappQueue = getInAppQueue()

  const pushId  = deriveNotificationId('chat.message_unread', event.messageId, 'push')
  const inappId = deriveNotificationId('chat.message_unread', event.messageId, 'inapp')

  await pushQueue.add(
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

  await inappQueue.add(
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
