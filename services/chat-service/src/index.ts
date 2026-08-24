import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin  from './plugins/trpc'
import ioPlugin    from './socket/io.plugin'
import { chatRoutes } from './routes/v1/chat.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('chat-service')

async function buildApp() {
  const app = Fastify({
    logger:     createFastifyLogger('chat-service'),
    trustProxy: true,
  })

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)
  await app.register(ioPlugin)   // must come after redisPlugin (uses fastify.redis)
  await app.register(chatRoutes, { prefix: '/api/v1/chat' })

  app.setErrorHandler((error, _req, reply) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) {
      app.log.error({ err: error }, 'Unhandled server error')
    }
    return reply.code(httpResp.statusCode).send(httpResp)
  })

  return app
}

async function start() {
  try {
    await initEventService(config.REDPANDA_BROKER!)
    logger.info('Kafka producer connected')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`chat-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start chat-service')
    process.exit(1)
  }
}

void start()
