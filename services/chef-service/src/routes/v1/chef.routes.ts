import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

/**
 * Helper that creates a tRPC caller from the Fastify request/reply context.
 */
function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

export async function chefRoutes(fastify: FastifyInstance): Promise<void> {
  // ── /me routes — must be registered BEFORE /:chefId to avoid 'me' being treated as param ──

  // GET /api/v1/chefs/me → getMyChefProfile
  fastify.get('/me', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.getMyChefProfile()
    return res.send(result)
  })

  // PATCH /api/v1/chefs/me → updateChefProfile
  fastify.patch('/me', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.updateChefProfile(req.body as any)
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/specialties → updateCuisineSpecialties
  fastify.put('/me/specialties', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.updateCuisineSpecialties(req.body as any)
    return res.send(result)
  })

  // PATCH /api/v1/chefs/me/service-area → updateServiceArea
  fastify.patch('/me/service-area', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.updateServiceArea(req.body as any)
    return res.send(result)
  })

  // POST /api/v1/chefs → createChefProfile
  fastify.post('/', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createChefProfile(req.body as any)
    return res.code(201).send(result)
  })

  // GET /api/v1/chefs/:chefId → getChefProfile
  fastify.get('/:chefId', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const caller = makeCaller(req, res)
    const result = await caller.getChefProfile({ chefId })
    return res.send(result)
  })

  // GET /api/v1/chefs/:chefId/status → getChefStatus
  fastify.get('/:chefId/status', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const caller = makeCaller(req, res)
    const result = await caller.getChefStatus({ chefId })
    return res.send(result)
  })

  // PATCH /api/v1/chefs/:chefId/status → updateChefStatus
  fastify.patch('/:chefId/status', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const caller = makeCaller(req, res)
    const result = await caller.updateChefStatus({ chefId, ...(req.body as any) })
    return res.send(result)
  })

  // Error handler for domain errors thrown from tRPC callers
  fastify.setErrorHandler((error, _req, res) => {
    if (isDomainError(error)) {
      return res.code(error.statusCode).send(toHttpResponse(error))
    }
    fastify.log.error({ err: error }, 'Unhandled chef route error')
    return res.code(500).send(toHttpResponse(error))
  })
}
