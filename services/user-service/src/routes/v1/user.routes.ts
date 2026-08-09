import type { FastifyInstance } from 'fastify'

/**
 * User REST routes placeholder.
 *
 * All user-service endpoints are served over tRPC at /trpc/*.
 * The tRPC plugin handles the full API surface.
 *
 * This plugin can be extended in future for non-tRPC needs
 * (e.g., health check, metrics, OAuth-style flows).
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'user-service' })
  })
}
