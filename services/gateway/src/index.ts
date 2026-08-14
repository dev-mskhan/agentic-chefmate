import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
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
    logger: createFastifyLogger('gateway'),
    trustProxy: true,
  })

  const allowedOrigins = config.CORS_ORIGINS!.split(',').map((o) => o.trim()).filter(Boolean)

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`Origin "${origin}" not allowed by CORS`), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-trace-id'],
    exposedHeaders: ['x-trace-id'],
    maxAge: 86400,
  })

  await app.register(fastifyCookie, { secret: config.COOKIE_SECRET })
  await app.register(redisPlugin)
  await app.register(rateLimitPlugin)
  await app.register(tracingPlugin)
  await app.register(authVerifyPlugin)
  await app.register(proxyPlugin)
  await app.register(gatewayRoutes)

  app.setErrorHandler((error, _request, reply) => {
    if (isDomainError(error)) {
      return reply.code(error.statusCode).send(toHttpResponse(error))
    }
    app.log.error({ err: error }, 'Unhandled gateway error')
    return reply.code(502).send({ statusCode: 502, message: 'Gateway error' })
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
