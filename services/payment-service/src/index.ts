import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import trpcPlugin from './plugins/trpc'
import { paymentRoutes } from './routes/v1/payment.routes'
import { webhookRoutes }  from './routes/v1/webhook.routes'
import { internalRoutes } from './routes/v1/internal.routes'
import { toHttpResponse } from '@chefmate/errors'

const logger = createLogger('payment-service')

async function buildApp() {
  const app = Fastify({ logger: createFastifyLogger('payment-service'), trustProxy: true })

  // rawBody must be registered before any route that needs req.rawBody
  await app.register(rawBody)

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(trpcPlugin)

  await app.register(paymentRoutes, { prefix: '/api/v1/payments' })
  await app.register(webhookRoutes,  { prefix: '/api/v1/payments' })
  await app.register(internalRoutes, { prefix: '/internal' })

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

    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`payment-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      process.exit(0)
    }
    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start payment-service')
    process.exit(1)
  }
}

void start()
