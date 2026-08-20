import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { createFastifyLogger, createLogger } from '@chefmate/logger'
import { config }      from './config'
import mongoPlugin     from './plugins/mongo'
import trpcPlugin      from './plugins/trpc'
import { toHttpResponse } from '@chefmate/errors'

const logger = createLogger('admin-service')

async function buildApp() {
  const app = Fastify({
    logger:     createFastifyLogger('admin-service'),
    trustProxy: true,
  })

  await app.register(mongoPlugin)
  await app.register(trpcPlugin)

  app.setErrorHandler((error, _req, reply) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) app.log.error({ err: error }, 'Unhandled server error')
    return reply.code(httpResp.statusCode).send(httpResp)
  })

  return app
}

async function start() {
  try {
    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`admin-service listening on port ${config.PORT}`)

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`)
      await app.close()
      process.exit(0)
    }
    process.once('SIGINT',  () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (err) {
    logger.error({ err }, 'Failed to start admin-service')
    process.exit(1)
  }
}

void start()
