import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { Kafka } from 'kafkajs'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import { createConsumer, ORDER_EVENTS_TOPIC } from '@chefmate/event-contracts'
import type { OrderEvent } from '@chefmate/event-contracts'
import { handleOrderEvent } from './consumers/order.consumer'
import mongoPlugin from './plugins/mongo'
import trpcPlugin from './plugins/trpc'
import { healthRoutes, setKafkaConsumerRunning } from './routes/v1/health.routes'
import { reviewRoutes } from './routes/v1/review.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('review-service')

async function buildApp() {
  const app = Fastify({
    logger:     createFastifyLogger('review-service'),
    trustProxy: true,
  })

  await app.register(mongoPlugin)
  await app.register(trpcPlugin)
  await app.register(healthRoutes)
  await app.register(reviewRoutes, { prefix: '/api/v1/reviews' })

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

    // ── Order event consumer ──────────────────────────────────────────────────
    const kafka = new Kafka({ clientId: 'review-service', brokers: [config.REDPANDA_BROKER!] })
    const orderConsumer = createConsumer(kafka, 'review-service-orders')
    await orderConsumer.connect()
    await orderConsumer.subscribe<OrderEvent>(ORDER_EVENTS_TOPIC, handleOrderEvent)
    setKafkaConsumerRunning(true)
    logger.info('Order event consumer started')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`review-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      setKafkaConsumerRunning(false)
      await app.close()
      await orderConsumer.disconnect()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start review-service')
    process.exit(1)
  }
}

void start()
