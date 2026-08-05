// Route registration is handled entirely by src/plugins/proxy.ts
// This file is kept as a placeholder for any gateway-specific non-proxy routes
// such as health checks.

import type { FastifyInstance } from 'fastify'

export async function gatewayRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async () => ({ status: 'ok', service: 'gateway' }))

  fastify.get('/ready', async (_req, reply) => {
    try {
      await (fastify as any).redis.ping()
      return reply.send({ status: 'ready', redis: 'ok' })
    } catch {
      return reply.code(503).send({ status: 'not ready', redis: 'error' })
    }
  })
}
