import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import httpProxy from '@fastify/http-proxy'
import { config } from '../config'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('gateway:ws-proxy')

export default fp(async function wsProxyPlugin(fastify: FastifyInstance) {
  const chatServiceUrl = config.CHAT_SERVICE_URL

  if (!chatServiceUrl) {
    logger.warn('CHAT_SERVICE_URL not set — skipping WebSocket proxy registration')
    return
  }

  await fastify.register(httpProxy, {
    upstream:      chatServiceUrl,
    prefix:        '/socket.io',
    rewritePrefix: '/socket.io',
    websocket:     true,
  })

  logger.info(`WebSocket proxy /socket.io → ${chatServiceUrl}`)
})
