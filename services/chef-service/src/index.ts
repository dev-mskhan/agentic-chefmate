import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin from './plugins/trpc'
import { chefRoutes } from './routes/v1/chef.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('chef-service')

async function buildApp() {
  const app = Fastify({
    logger:      createFastifyLogger('chef-service'),
    trustProxy:  true,
  })

  // OpenAPI / Swagger
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title:   'ChefMate Chef Service',
        version: '1.0.0',
      },
    },
  })
  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  })

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)

  await app.register(chefRoutes, { prefix: '/api/v1/chefs' })

  app.setErrorHandler((error, _request, reply) => {
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
    logger.info('Redpanda producer connected')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`chef-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start chef-service')
    process.exit(1)
  }
}

void start()
