import type { Socket } from 'socket.io'
import { importSPKI, jwtVerify } from 'jose'
import { createLogger } from '@chefmate/logger'
import { config } from '../config'

const logger = createLogger('chat-service:socket-auth')

// Module-scoped cache — loaded once at startup
let _publicKey: Awaited<ReturnType<typeof importSPKI>> | null = null

async function getPublicKey(): Promise<Awaited<ReturnType<typeof importSPKI>>> {
  if (!_publicKey) {
    const pem = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
    _publicKey = await importSPKI(pem, 'RS256')
  }
  return _publicKey
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  let token = (socket.handshake.auth as Record<string, unknown>)?.token as string | undefined

  if (!token) {
    const authHeader = socket.handshake.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  if (!token) {
    const cookieHeader = socket.handshake.headers.cookie
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:__Host-access|access)=([^;]+)/)
      if (match && match[1]) {
        const raw = decodeURIComponent(match[1])
        // Fastify signed cookie: JWT.COOKIE_HMAC_SIG (may have s: prefix)
        let val = raw.startsWith('s:') ? raw.slice(2) : raw
        // A JWT has exactly 2 dots (3 segments). If more, strip trailing cookie signature.
        const dotCount = (val.match(/\./g) || []).length
        if (dotCount > 2) {
          val = val.slice(0, val.lastIndexOf('.'))
        }
        token = val
      }
    }
  }

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
  } catch (err: any) {
    logger.warn({ err: err?.message ?? err, token }, 'Socket auth failed')
    socket.emit('error', err?.message ?? 'Invalid token')
    socket.disconnect(true)
    next(new Error(err?.message ?? 'Invalid token'))
  }
}
