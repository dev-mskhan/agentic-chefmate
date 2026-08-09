import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import Redis from 'ioredis'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import { startAuthConsumer, stopAuthConsumer } from './consumers/auth.consumer'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin from './plugins/trpc'
import { userRoutes } from './routes/v1/user.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('user-service')

async function buildApp() {
  const app = Fastify({
    logger: createFastifyLogger('user-service'),
    trustProxy: true,
  })

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)

  await app.register(userRoutes, { prefix: '/api/v1/users' })

  app.setErrorHandler((error, _request, reply) => {
    if (isDomainError(error)) {
      return reply.code(error.statusCode).send(toHttpResponse(error))
    }
    app.log.error({ err: error }, 'Unhandled error')
    return reply.code(500).send(toHttpResponse(error))
  })

  return app
}

async function start() {
  try {
    await initEventService(config.REDPANDA_BROKER!)
    logger.info('Redpanda producer connected')

    // Create a separate Redis instance for the consumer (before Fastify starts)
    const consumerRedis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
    await startAuthConsumer(config.REDPANDA_BROKER!, consumerRedis)
    logger.info('Auth consumer started')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`user-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      await stopAuthConsumer()
      await consumerRedis.quit()
      process.exit(0)
    }

    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start user-service')
    process.exit(1)
  }
}

void start()
