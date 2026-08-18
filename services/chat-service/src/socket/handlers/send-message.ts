import type { Socket, Server } from 'socket.io'
import type Redis from 'ioredis'
import { ChatThread } from '../../models/thread.model'
import { Message } from '../../models/message.model'
import { getOrCreateThread, getRecipientId, getRecipientUnreadField } from '../../services/thread.service'
import { isOnline } from '../../services/presence.service'
import { publishChatEvent } from '../../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chat-service:send-message')

export async function handleSendMessage(
  socket: Socket,
  io: Server,
  redis: Redis,
  data: { orderId: string; content: string; clientMessageId?: string },
): Promise<void> {
  const { userId, role } = socket.data as { userId: string; role: string }

  // 1. Content length check
  if (!data.content || data.content.length > 2000) {
    socket.emit('error', 'Content exceeds 2000 characters')
    return
  }

  // 2. Participant check + thread fetch
  let thread
  try {
    thread = await getOrCreateThread(data.orderId, { userId, role })
  } catch {
    socket.emit('error', 'Not a participant')
    return
  }

  // 3. clientMessageId idempotency check
  if (data.clientMessageId) {
    const existing = await Message.findOne({ clientMessageId: data.clientMessageId }).lean()
    if (existing) {
      socket.emit('message:new', existing)
      return
    }
  }

  // 4. Persist message — senderId ALWAYS from socket.data, NEVER from client payload
  let message
  try {
    message = await Message.create({
      threadId:         (thread._id as { toString(): string }).toString(),
      orderId:          data.orderId,
      senderId:         userId,           // server-derived, never client
      senderRole:       role as 'USER' | 'CHEF',
      content:          data.content,
      messageType:      'TEXT' as const,
      clientMessageId:  data.clientMessageId,
    })
  } catch (err: unknown) {
    // Handle duplicate clientMessageId race condition
    if ((err as { code?: number }).code === 11000 && data.clientMessageId) {
      const existing = await Message.findOne({ clientMessageId: data.clientMessageId }).lean()
      if (existing) { socket.emit('message:new', existing); return }
    }
    logger.error({ err }, 'Failed to persist message')
    socket.emit('error', 'Failed to send message')
    return
  }

  // 5. Update thread metadata
  const recipientUnreadField = getRecipientUnreadField(role)
  await ChatThread.findByIdAndUpdate(thread._id, {
    $set:  { lastMessageAt: message.createdAt, lastMessageId: (message._id as { toString(): string }).toString() },
    $inc:  { [recipientUnreadField]: 1 },
  })

  // 6. Broadcast to room
  const messageObj = message.toObject()
  io.to(`order:${data.orderId}`).emit('message:new', messageObj)

  // 7. Kafka: always publish chat.message_sent
  const recipientId = getRecipientId(thread, userId)
  const now         = message.createdAt.toISOString()
  const msgId       = (message._id as { toString(): string }).toString()
  const threadId    = (thread._id as { toString(): string }).toString()

  await publishChatEvent({
    type:        'chat.message_sent',
    messageId:   msgId,
    threadId,
    senderId:    userId,
    recipientId,
    content:     data.content,
    createdAt:   now,
    version:     '1',
  })

  // 8. Kafka: publish chat.message_unread only if recipient is offline
  const recipientOnline = await isOnline(redis, recipientId)
  if (!recipientOnline) {
    await publishChatEvent({
      type:        'chat.message_unread',
      messageId:   msgId,
      threadId,
      senderId:    userId,
      recipientId,
      createdAt:   now,
      version:     '1',
    })
  }
}
