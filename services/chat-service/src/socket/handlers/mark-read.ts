import type { Socket, Server } from 'socket.io'
import { ChatThread } from '../../models/thread.model'
import { Message } from '../../models/message.model'
import { isParticipant, getUnreadCountField, resolveChefId } from '../../services/thread.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chat-service:mark-read')

export async function handleMarkRead(
  socket: Socket,
  io: Server,
  data: { threadId: string },
): Promise<void> {
  const { userId, role } = socket.data as { userId: string; role: string }

  const thread = await ChatThread.findById(data.threadId)
  const callerChefId = role === 'CHEF' ? await resolveChefId(userId) : undefined
  if (!thread || !isParticipant(thread, userId, callerChefId)) {
    socket.emit('error', 'Not a participant')
    return
  }

  const now = new Date()

  // Mark all messages NOT sent by caller as read (messages caller received)
  await Message.updateMany(
    { threadId: data.threadId, senderId: { $ne: userId }, readAt: null },
    { $set: { readAt: now } },
  )

  // Reset caller's unread count
  const callerUnreadField = getUnreadCountField(role)
  await ChatThread.findByIdAndUpdate(data.threadId, {
    $set: { [callerUnreadField]: 0 },
  })

  // Broadcast read receipt to room
  const threadRoom = `order:${thread.orderId}`
  io.to(threadRoom).emit('message:read', {
    threadId: data.threadId,
    readBy:   userId,
    readAt:   now.toISOString(),
  })
}
