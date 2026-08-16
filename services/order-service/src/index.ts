import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { Kafka } from 'kafkajs'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import { createConsumer, PAYMENT_EVENTS_TOPIC } from '@chefmate/event-contracts'
import type { PaymentEvent } from '@chefmate/event-contracts'
import { handlePaymentEvent } from './consumers/payment.consumer'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin from './plugins/trpc'
import { orderRoutes } from './routes/v1/order.routes'
import { internalOrderRoutes } from './routes/v1/internal.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('order-service')

async function buildApp() {
  const app = Fastify({
    logger:     createFastifyLogger('order-service'),
    trustProxy: true,
  })

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)

  await app.register(orderRoutes, { prefix: '/api/v1/orders' })
  await app.register(internalOrderRoutes, { prefix: '/internal' })

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

    // ── Payment event consumer ────────────────────────────────────────────────
    const kafka = new Kafka({ clientId: 'order-service', brokers: [config.REDPANDA_BROKER!] })
    const paymentConsumer = createConsumer(kafka, 'order-service-payments')
    await paymentConsumer.connect()
    await paymentConsumer.subscribe<PaymentEvent>(PAYMENT_EVENTS_TOPIC, handlePaymentEvent)
    logger.info('Payment event consumer started')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`order-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await paymentConsumer.disconnect()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start order-service')
    process.exit(1)
  }
}

void start()
