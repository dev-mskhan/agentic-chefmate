import type { Socket } from 'socket.io'

export async function handleLeaveThread(
  socket: Socket,
  data: { orderId: string },
): Promise<void> {
  await socket.leave(`order:${data.orderId}`)
}
