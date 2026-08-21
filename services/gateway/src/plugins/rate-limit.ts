import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import fastifyRateLimit from '@fastify/rate-limit'
import { config } from '../config'

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Rate limit by userId if authenticated, otherwise by IP
      const userId = req.headers['x-user-id']
      return (Array.isArray(userId) ? userId[0] : userId) ?? req.ip
    },
    redis: (fastify as any).redis,
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${context.after}`,
      },
    }),
  })
})
