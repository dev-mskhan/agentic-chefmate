import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyRateLimit from '@fastify/rate-limit'
import * as argon2 from 'argon2'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import { initEventService, disconnectEventService } from './services/event.service'
import { User } from './models/user.model'
import mongoPlugin from './plugins/mongo'
import redisPlugin from './plugins/redis'
import passportPlugin from './plugins/passport'
import trpcPlugin from './plugins/trpc'
import { authRoutes } from './routes/v1/auth.routes'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

const logger = createLogger('auth-service')

/**
 * Ensure a pre-seeded admin account exists at boot.
 * If no ADMIN user is found in the database, create one with the credentials
 * from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. This gives tests and local
 * development a known admin identity they can sign in with to obtain an
 * ADMIN-role access token. In production this is a no-op if an admin already
 * exists.
 */
async function seedAdminAccount(): Promise<void> {
  const existing = await User.findOne({ role: 'ADMIN' })
  if (existing) {
    logger.info({ email: existing.email }, 'Admin account already exists — skipping seed')
    return
  }
  const email = config.SEED_ADMIN_EMAIL!.toLowerCase()
  const passwordHash = await argon2.hash(config.SEED_ADMIN_PASSWORD!, { type: argon2.argon2id })
  await User.create({
    email,
    passwordHash,
    role: 'ADMIN',
    emailVerified: true,
  })
  logger.info({ email }, 'Seeded initial admin account')
}

async function buildApp() {
  const app = Fastify({
    logger: createFastifyLogger('auth-service'),
    trustProxy: true,
  })

  await app.register(fastifyCookie, { secret: config.COOKIE_SECRET })
  await app.register(fastifyRateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  await app.register(mongoPlugin)
  await app.register(redisPlugin)
  await app.register(passportPlugin)
  await app.register(trpcPlugin)

  await app.register(authRoutes, { prefix: '/api/v1/auth' })

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
    // Seed admin account after Mongo is connected (mongoPlugin runs in buildApp)
    await seedAdminAccount()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`auth-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      await disconnectEventService()
      process.exit(0)
    }

    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start auth-service')
    process.exit(1)
  }
}

void start()
