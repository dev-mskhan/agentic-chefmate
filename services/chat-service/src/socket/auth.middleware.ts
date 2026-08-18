import type { Socket } from 'socket.io'
import { importSPKI, jwtVerify } from 'jose'
import { createLogger } from '@chefmate/logger'
import { config } from '../config'

const logger = createLogger('chat-service:socket-auth')

// Module-scoped cache — loaded once at startup
let _publicKey: Awaited<ReturnType<typeof importSPKI>> | null = null

async function getPublicKey(): Promise<Awaited<ReturnType<typeof importSPKI>>> {
  if (!_publicKey) {
    _publicKey = await importSPKI(config.JWT_PUBLIC_KEY, 'RS256')
  }
  return _publicKey
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token = (socket.handshake.auth as Record<string, unknown>)?.token as string | undefined

  if (!token) {
    socket.emit('error', 'Authentication required')
    socket.disconnect(true)
    return next(new Error('Authentication required'))
  }

  try {
    const publicKey = await getPublicKey()
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })

    socket.data.userId = payload.sub as string
    socket.data.role   = payload['role'] as string

    if (!socket.data.userId || !socket.data.role) {
      throw new Error('Missing required JWT claims')
    }

    next()
  } catch (err) {
    logger.warn({ err }, 'Socket auth failed')
    socket.emit('error', 'Invalid token')
    socket.disconnect(true)
    next(new Error('Invalid token'))
  }
}
