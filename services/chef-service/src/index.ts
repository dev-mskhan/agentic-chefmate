import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import { createConsumer, REVIEW_EVENTS_TOPIC, MEDIA_EVENTS_TOPIC } from '@chefmate/event-contracts'
import type { ReviewEvent, MediaEvent } from '@chefmate/event-contracts'
import { handleReviewEvent } from './consumers/review.consumer'
import { handleMediaEvent } from './consumers/media.consumer'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin from './plugins/trpc'
import { chefRoutes } from './routes/v1/chef.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'
import { Kafka } from 'kafkajs'

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

    // ── Review event consumer ─────────────────────────────────────────────────
    const kafka = new Kafka({ clientId: 'chef-service', brokers: [config.REDPANDA_BROKER!] })
    const reviewConsumer = createConsumer(kafka, 'chef-service-reviews')
    await reviewConsumer.connect()
    await reviewConsumer.subscribe<ReviewEvent>(REVIEW_EVENTS_TOPIC, handleReviewEvent)
    logger.info('Review event consumer started')

    // ── Media event consumer ──────────────────────────────────────────────────
    // Listens for media.deleted events to remove deleted mediaIds from
    // dishes, meal plans, and chef profiles that reference them.
    const mediaConsumer = createConsumer(kafka, 'chef-service-media')
    await mediaConsumer.connect()
    await mediaConsumer.subscribe<MediaEvent>(MEDIA_EVENTS_TOPIC, handleMediaEvent)
    logger.info('Media event consumer started')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`chef-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await reviewConsumer.disconnect()
      await mediaConsumer.disconnect()
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
