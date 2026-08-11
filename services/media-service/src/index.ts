import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import type { MediaConfig } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import mongoPlugin from './plugins/mongo'
import { createStorage } from './storage/storage.factory'
import { mediaRoutes } from './routes/v1/media.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('media-service')

async function buildApp() {
  const app = Fastify({ logger: createFastifyLogger('media-service'), trustProxy: true })

  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'ChefMate Media Service', version: '1.0.0' },
      components: { securitySchemes: {} },
    },
  })
  await app.register(fastifySwaggerUi, { routePrefix: '/documentation' })
  await app.register(mongoPlugin)

  const storage = createStorage(config as MediaConfig)
  await app.register(mediaRoutes, { prefix: '/api/v1/media', storage, config: config as MediaConfig })

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

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`media-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start media-service')
    process.exit(1)
  }
}

void start()
