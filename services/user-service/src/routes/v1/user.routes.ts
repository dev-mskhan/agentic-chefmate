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
  // Health check (supports GET and OPTIONS preflight)
  fastify.route({
    method: ['GET', 'OPTIONS'],
    url: '/health',
    handler: async (_request, reply) => {
      return reply.code(200).send({ statusCode: 200, message: 'Success', data: { status: 'ok', service: 'user-service' } })
    },
  })
}
