import type { Socket } from 'socket.io'
import { getOrCreateThread } from '../../services/thread.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chat-service:join-thread')

export async function handleJoinThread(
  socket: Socket,
  data: { orderId: string },
): Promise<void> {
  const { userId, role } = socket.data as { userId: string; role: string }
  try {
    await getOrCreateThread(data.orderId, { userId, role })
    await socket.join(`order:${data.orderId}`)
    logger.info({ userId, orderId: data.orderId }, 'User joined thread room')
  } catch (err) {
    socket.emit('error', 'Not a participant')
  }
}
