import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import Redis from 'ioredis'
import { config } from '../config'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

export default fp(async function redisPlugin(fastify: FastifyInstance) {
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  })

  redis.on('connect', () => fastify.log.info('Redis connected'))
  redis.on('error', (err) => fastify.log.error({ err }, 'Redis error'))

  fastify.decorate('redis', redis)

  fastify.addHook('onClose', async () => {
    await redis.quit()
    fastify.log.info('Redis disconnected')
  })
})
