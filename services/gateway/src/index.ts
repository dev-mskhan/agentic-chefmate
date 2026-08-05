import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { createLogger } from '@chefmate/logger'
import { config } from './config'
import { toHttpResponse, isDomainError } from '@chefmate/errors'
import redisPlugin from './plugins/redis'
import rateLimitPlugin from './plugins/rate-limit'
import tracingPlugin from './plugins/tracing'
import authVerifyPlugin from './plugins/auth-verify'
import proxyPlugin from './plugins/proxy'
import { gatewayRoutes } from './routes/proxy.routes'

const logger = createLogger('gateway')

async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV === 'production'
      ? logger
      : { level: config.LOG_LEVEL },
    trustProxy: true,
  })

  // Cookies (needed for auth cookie extraction)
  await app.register(fastifyCookie, { secret: config.COOKIE_SECRET })

  // Infrastructure plugins
  await app.register(redisPlugin)
  await app.register(rateLimitPlugin)
  await app.register(tracingPlugin)

  // Auth verify plugin (warms up JWKS cache)
  await app.register(authVerifyPlugin)

  // Proxy plugin (must come after auth-verify plugin)
  await app.register(proxyPlugin)

  // Health / readiness routes
  await app.register(gatewayRoutes)

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (isDomainError(error)) {
      return reply.code(error.statusCode).send(toHttpResponse(error))
    }
    app.log.error({ err: error }, 'Unhandled gateway error')
    return reply.code(502).send({ error: { code: 'BAD_GATEWAY', message: 'Gateway error' } })
  })

  return app
}

async function start() {
  try {
    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`gateway listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gateway`)
      await app.close()
      process.exit(0)
    }

    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start gateway')
    process.exit(1)
  }
}

void start()
