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
import { subscriptionRoutes } from './routes/v1/subscription.routes'
import { startBillingWorker } from './workers/billing.worker'
import { closeBillingQueue } from './queues/subscription.queue'
import { toHttpResponse } from '@chefmate/errors'

const logger = createLogger('subscription-service')

async function buildApp() {
  const app = Fastify({ logger: createFastifyLogger('subscription-service'), trustProxy: true })
  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)
  await app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' })
  app.setErrorHandler((error, _request, reply) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) app.log.error({ err: error }, 'Unhandled server error')
    return reply.code(httpResp.statusCode).send(httpResp)
  })
  return app
}

async function start() {
  try {
    await initEventService(config.REDPANDA_BROKER!)
    logger.info('Redpanda producer connected')

    // ── BullMQ billing worker ─────────────────────────────────────────────────
    const billingWorker = startBillingWorker()
    logger.info('Subscription billing worker started')

    // ── Payment event consumer ────────────────────────────────────────────────
    const kafka = new Kafka({ clientId: 'subscription-service', brokers: [config.REDPANDA_BROKER!] })
    const paymentConsumer = createConsumer(kafka, 'subscription-service-payments')
    await paymentConsumer.connect()
    await paymentConsumer.subscribe<PaymentEvent>(PAYMENT_EVENTS_TOPIC, handlePaymentEvent)
    logger.info('Payment event consumer started')

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`subscription-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await billingWorker.close()
      await closeBillingQueue()
      await paymentConsumer.disconnect()
      await disconnectEventService()
      process.exit(0)
    }
    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start subscription-service')
    process.exit(1)
  }
}

void start()
