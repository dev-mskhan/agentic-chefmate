import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config } from './config'
import mongoPlugin from './plugins/mongo'
import trpcPlugin from './plugins/trpc'
import { toHttpResponse } from '@chefmate/errors'

const logger = createLogger('dashboard-service')

async function buildApp() {
  const app = Fastify({ logger: createFastifyLogger('dashboard-service'), trustProxy: true })

  await app.register(mongoPlugin)
  await app.register(trpcPlugin)

  app.setErrorHandler((error, _req, reply) => {
    const r = toHttpResponse(error)
    if (r.statusCode >= 500) app.log.error({ err: error }, 'Unhandled error')
    return reply.code(r.statusCode).send(r)
  })

  return app
}

async function start() {
  try {
    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`dashboard-service listening on port ${config.PORT}`)

    const shutdown = async (sig: string) => {
      logger.info(`${sig} received`)
      await app.close()
      process.exit(0)
    }
    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start')
    process.exit(1)
  }
}

void start()
