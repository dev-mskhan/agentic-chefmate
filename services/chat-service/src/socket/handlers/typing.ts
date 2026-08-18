import type { Socket } from 'socket.io'

export function handleTypingStart(
  socket: Socket,
  data: { orderId: string },
): void {
  const { userId } = socket.data as { userId: string }
  // Forward to all OTHER sockets in the room (excluding sender)
  socket.to(`order:${data.orderId}`).emit('typing:start', { userId, orderId: data.orderId })
  // NO database writes, NO Kafka events
}

export function handleTypingStop(
  socket: Socket,
  data: { orderId: string },
): void {
  const { userId } = socket.data as { userId: string }
  socket.to(`order:${data.orderId}`).emit('typing:stop', { userId, orderId: data.orderId })
}
