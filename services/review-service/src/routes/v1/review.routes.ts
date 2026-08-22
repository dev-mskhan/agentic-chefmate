import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as http from 'http'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse } from '@chefmate/errors'

function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

async function callTrpc<T>(
  req: FastifyRequest,
  res: FastifyReply,
  fn: (caller: ReturnType<typeof makeCaller>) => Promise<T>,
  successCode: number = 200,
): Promise<void> {
  try {
    const caller = makeCaller(req, res)
    const result = await fn(caller)
    return res.code(successCode).send(result)
  } catch (err: any) {
    const domainErr = err?.cause ?? err
    const codeMap: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      BAD_REQUEST: 400,
      CONFLICT: 409,
      UNPROCESSABLE_CONTENT: 422,
      TOO_MANY_REQUESTS: 429,
    }
    const statusCode: number = domainErr?.statusCode ?? codeMap[err?.code ?? ''] ?? 500
    const message: string = domainErr?.message ?? err?.message ?? 'Internal server error'
    return res.code(statusCode).send({
      statusCode,
      message,
      error: http.STATUS_CODES[statusCode] ?? 'Error',
    })
  }
}

export async function reviewRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Customer: Create review ──────────────────────────────────────────────
  // POST /api/v1/reviews
  fastify.post('/', async (req, res) => {
    return callTrpc(req, res, (c) => c.createReview(req.body as any), 201)
  })

  // ── Public: Get single review ────────────────────────────────────────────
  // GET /api/v1/reviews/public/:reviewId
  fastify.get('/public/:reviewId', async (req, res) => {
    const { reviewId } = req.params as { reviewId: string }
    return callTrpc(req, res, (c) => c.getReview({ reviewId }))
  })

  // ── Chef: Reply to review ────────────────────────────────────────────────
  // POST /api/v1/reviews/:reviewId/reply
  fastify.post('/:reviewId/reply', async (req, res) => {
    const { reviewId } = req.params as { reviewId: string }
    const body = (req.body ?? {}) as { text?: string }
    return callTrpc(req, res, (c) => c.replyToReview({ reviewId, text: body.text ?? '' }))
  })

  // ── Admin: Moderate review status ─────────────────────────────────────────
  // POST /api/v1/reviews/:reviewId/moderate
  fastify.post('/:reviewId/moderate', async (req, res) => {
    const { reviewId } = req.params as { reviewId: string }
    const body = (req.body ?? {}) as { status?: any }
    return callTrpc(req, res, (c) => c.moderateReview({ reviewId, status: body.status }))
  })

  // ── Public: List chef reviews ────────────────────────────────────────────
  // GET /api/v1/reviews/public/chef/:chefId
  fastify.get('/public/chef/:chefId', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.listChefReviews({
      chefId,
      page:  q['page'] ? parseInt(q['page'], 10) : undefined,
      limit: q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Public: List dish reviews ────────────────────────────────────────────
  // GET /api/v1/reviews/public/dish/:dishId
  fastify.get('/public/dish/:dishId', async (req, res) => {
    const { dishId } = req.params as { dishId: string }
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.listDishReviews({
      dishId,
      page:  q['page'] ? parseInt(q['page'], 10) : undefined,
      limit: q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Public: List plan reviews ────────────────────────────────────────────
  // GET /api/v1/reviews/public/plan/:planId
  fastify.get('/public/plan/:planId', async (req, res) => {
    const { planId } = req.params as { planId: string }
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.listPlanReviews({
      planId,
      page:  q['page'] ? parseInt(q['page'], 10) : undefined,
      limit: q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Error handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _req, res) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) {
      fastify.log.error({ err: error }, 'Unhandled review route error')
    }
    return res.code(httpResp.statusCode).send(httpResp)
  })
}
