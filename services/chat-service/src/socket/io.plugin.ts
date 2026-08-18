import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { config } from '../config'
import { socketAuthMiddleware } from './auth.middleware'
import { registerHandlers }    from './handlers'
import { setOnline, setOffline } from '../services/presence.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chat-service:socket')

declare module 'fastify' {
  interface FastifyInstance { io: Server }
}

export default fp(async function ioPlugin(fastify: FastifyInstance) {
  // Create dedicated ioredis clients for the Redis adapter (pub + sub)
  const pubClient = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
  const subClient = pubClient.duplicate()

  const io = new Server(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    adapter: createAdapter(pubClient, subClient),
  })

  // Socket.IO auth middleware — runs before any connection handler
  io.use(socketAuthMiddleware)

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    logger.info({ userId }, 'Socket connected')

    // Set Redis presence key
    void setOnline(fastify.redis, userId)

    // Register all event handlers
    registerHandlers(socket, io, fastify)

    socket.on('disconnect', () => {
      logger.info({ userId }, 'Socket disconnected')
      void setOffline(fastify.redis, userId)
    })
  })

  fastify.decorate('io', io)

  fastify.addHook('onClose', async () => {
    await io.close()
    await pubClient.quit()
    await subClient.quit()
    logger.info('Socket.IO server closed')
  })
})
