import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import crypto from 'crypto'

export default fp(async function tracingPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    const existing = request.headers['x-trace-id']
    if (!existing) {
      request.headers['x-trace-id'] = crypto.randomUUID()
    }
  })
})
