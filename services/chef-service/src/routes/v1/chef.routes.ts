import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse, isDomainError } from '@chefmate/errors'
import {
  CuisineCategoryValues, CUISINE_LABELS,
  OccasionTagValues, OCCASION_LABELS,
  DietaryTagValues, DIETARY_LABELS,
  AllergenValues, ALLERGEN_LABELS,
} from '../../constants'

/**
 * Helper that creates a tRPC caller from the Fastify request/reply context.
 */
function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

export async function chefRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Phase 4: /meta routes — NO auth, registered FIRST to avoid 'meta' as :chefId ──

  // GET /api/v1/chefs/meta/cuisines → listCuisineCategories (public)
  fastify.get('/meta/cuisines', async (_req, res) => {
    return res.send({ values: CuisineCategoryValues, labels: CUISINE_LABELS })
  })

  // GET /api/v1/chefs/meta/occasion-tags → listOccasionTags (public)
  fastify.get('/meta/occasion-tags', async (_req, res) => {
    return res.send({ values: OccasionTagValues, labels: OCCASION_LABELS })
  })

  // GET /api/v1/chefs/meta/dietary-tags → listDietaryTags (public)
  fastify.get('/meta/dietary-tags', async (_req, res) => {
    return res.send({ values: DietaryTagValues, labels: DIETARY_LABELS })
  })

  // GET /api/v1/chefs/meta/allergens → listAllergens (public)
  fastify.get('/meta/allergens', async (_req, res) => {
    return res.send({ values: AllergenValues, labels: ALLERGEN_LABELS })
  })

  // ── /me routes — registered BEFORE /:chefId ────────────────────────────────

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

  // ── Phase 3: Dish /me routes ──────────────────────────────────────────────

  // POST /api/v1/chefs/me/dishes → createDish
  fastify.post('/me/dishes', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createDish(req.body as any)
    return res.code(201).send(result)
  })

  // PATCH /api/v1/chefs/me/dishes/:dishId → updateDish
  fastify.patch('/me/dishes/:dishId', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.updateDish({ dishId, ...(req.body as any) })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/dishes/:dishId/archive → archiveDish
  fastify.post('/me/dishes/:dishId/archive', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.archiveDish({ dishId })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/dishes/:dishId/activate → activateDish
  fastify.post('/me/dishes/:dishId/activate', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.activateDish({ dishId })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/dishes/:dishId/deactivate → deactivateDish
  fastify.post('/me/dishes/:dishId/deactivate', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.deactivateDish({ dishId })
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/dishes/:dishId/media → manageDishMedia
  fastify.put('/me/dishes/:dishId/media', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.manageDishMedia({ dishId, ...(req.body as any) })
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/dishes/:dishId/ingredients → manageIngredients
  fastify.put('/me/dishes/:dishId/ingredients', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.manageIngredients({ dishId, ...(req.body as any) })
    return res.send(result)
  })

  // PATCH /api/v1/chefs/me/dishes/:dishId/pricing → managePricing
  fastify.patch('/me/dishes/:dishId/pricing', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.managePricing({ dishId, ...(req.body as any) })
    return res.send(result)
  })

  // PATCH /api/v1/chefs/me/dishes/:dishId/availability → manageAvailability
  fastify.patch('/me/dishes/:dishId/availability', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.manageAvailability({ dishId, ...(req.body as any) })
    return res.send(result)
  })

  // ── Phase 5: Schedule /me routes ─────────────────────────────────────────

  // PUT /api/v1/chefs/me/schedule → upsertChefSchedule
  fastify.put('/me/schedule', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.upsertChefSchedule(req.body as any)
    return res.send(result)
  })

  // POST /api/v1/chefs/me/schedule/blackout → addBlackoutDate
  fastify.post('/me/schedule/blackout', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.addBlackoutDate(req.body as any)
    return res.send(result)
  })

  // DELETE /api/v1/chefs/me/schedule/blackout/:date → removeBlackoutDate
  fastify.delete('/me/schedule/blackout/:date', async (req, res) => {
    const { date } = req.params as { date: string }
    const caller = makeCaller(req, res)
    const result = await caller.removeBlackoutDate({ date, ...(req.body as any) })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/schedule/one-off → addOneOffDate
  fastify.post('/me/schedule/one-off', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.addOneOffDate(req.body as any)
    return res.send(result)
  })

  // DELETE /api/v1/chefs/me/schedule/one-off/:date → removeOneOffDate
  fastify.delete('/me/schedule/one-off/:date', async (req, res) => {
    const { date } = req.params as { date: string }
    const caller = makeCaller(req, res)
    const result = await caller.removeOneOffDate({ date })
    return res.send(result)
  })

  // PATCH /api/v1/chefs/me/schedule/capacity → updateCapacity
  fastify.patch('/me/schedule/capacity', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.updateCapacity(req.body as any)
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/schedule/delivery-zones → updateDeliveryZones
  fastify.put('/me/schedule/delivery-zones', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.updateDeliveryZones(req.body as any)
    return res.send(result)
  })

  // ── Phase 6: Plan /me routes ──────────────────────────────────────────────

  // POST /api/v1/chefs/me/plans → createPlan
  fastify.post('/me/plans', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createPlan(req.body as any)
    return res.code(201).send(result)
  })

  // PATCH /api/v1/chefs/me/plans/:planId → updatePlan
  fastify.patch('/me/plans/:planId', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.updatePlan({ planId, ...(req.body as any) })
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/plans/:planId/tiers → managePlanTiers
  fastify.put('/me/plans/:planId/tiers', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.managePlanTiers({ planId, ...(req.body as any) })
    return res.send(result)
  })

  // PUT /api/v1/chefs/me/plans/:planId/media → managePlanMedia
  fastify.put('/me/plans/:planId/media', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.managePlanMedia({ planId, ...(req.body as any) })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/plans/:planId/activate → activatePlan
  fastify.post('/me/plans/:planId/activate', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.activatePlan({ planId })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/plans/:planId/pause → pausePlan
  fastify.post('/me/plans/:planId/pause', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.pausePlan({ planId })
    return res.send(result)
  })

  // POST /api/v1/chefs/me/plans/:planId/archive → archivePlan
  fastify.post('/me/plans/:planId/archive', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.archivePlan({ planId })
    return res.send(result)
  })

  // ── Chef creation ─────────────────────────────────────────────────────────

  // POST /api/v1/chefs → createChefProfile
  fastify.post('/', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createChefProfile(req.body as any)
    return res.code(201).send(result)
  })

  // ── /:chefId routes — parameterized, registered AFTER /me ─────────────────

  // GET /api/v1/chefs/:chefId/schedule → getChefSchedule
  fastify.get('/:chefId/schedule', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const caller = makeCaller(req, res)
    const result = await caller.getChefSchedule({ chefId })
    return res.send(result)
  })

  // GET /api/v1/chefs/:chefId/availability → checkChefAvailability (?date=YYYY-MM-DD)
  fastify.get('/:chefId/availability', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const query = req.query as Record<string, string>
    const caller = makeCaller(req, res)
    const result = await caller.checkChefAvailability({ chefId, date: query['date']! })
    return res.send(result)
  })

  // GET /api/v1/chefs/:chefId/plans → listChefPlans
  fastify.get('/:chefId/plans', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const query = req.query as Record<string, string>
    const caller = makeCaller(req, res)
    const result = await caller.listChefPlans({
      chefId,
      status: query['status'] as any,
      type:   query['type'] as any,
      limit:  query['limit']  ? parseInt(query['limit'],  10) : undefined,
      offset: query['offset'] ? parseInt(query['offset'], 10) : undefined,
    })
    return res.send(result)
  })

  // GET /api/v1/chefs/:chefId/plans/:planId → getPlan
  fastify.get('/:chefId/plans/:planId', async (req, res) => {
    const { planId } = req.params as { chefId: string; planId: string }
    const caller = makeCaller(req, res)
    const result = await caller.getPlan({ planId })
    return res.send(result)
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

  // ── Phase 3: Dish /:chefId routes ─────────────────────────────────────────

  // GET /api/v1/chefs/:chefId/dishes → listChefDishes
  fastify.get('/:chefId/dishes', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const query = req.query as Record<string, string | string[]>
    const caller = makeCaller(req, res)
    const result = await caller.listChefDishes({
      chefId,
      status:      query['status'] as any,
      cuisine:     query['cuisine'] as string | undefined,
      cuisines:    query['cuisines']
        ? (Array.isArray(query['cuisines']) ? query['cuisines'] : [query['cuisines']]) as any
        : undefined,
      dietaryTags: query['dietaryTags']
        ? (Array.isArray(query['dietaryTags']) ? query['dietaryTags'] : [query['dietaryTags']]) as any
        : undefined,
      limit:   query['limit']  ? parseInt(query['limit'] as string, 10)  : undefined,
      offset:  query['offset'] ? parseInt(query['offset'] as string, 10) : undefined,
    })
    return res.send(result)
  })

  // GET /api/v1/chefs/:chefId/dishes/:dishId → getDish
  fastify.get('/:chefId/dishes/:dishId', async (req, res) => {
    const { dishId } = req.params as { chefId: string; dishId: string }
    const caller = makeCaller(req, res)
    const result = await caller.getDish({ dishId })
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
