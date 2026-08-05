import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import fastifyRedis from '@fastify/redis'
import { config } from '../config'

export default fp(async function redisPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRedis, {
    url: config.REDIS_URL,
    closeClient: true,
  })
  fastify.log.info('Redis connected')
})
