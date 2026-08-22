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
      UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
      BAD_REQUEST: 400, CONFLICT: 409, UNPROCESSABLE_CONTENT: 422,
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

export async function payoutRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Chef: create Stripe Connect account ──────────────────────────────────
  // POST /api/v1/payouts/connect
  fastify.post('/connect', async (req, res) => {
    return callTrpc(req, res, (c) => c.createConnectAccount(), 201)
  })

  // ── Chef: create Stripe onboarding link ──────────────────────────────────
  // POST /api/v1/payouts/connect/onboarding-link
  fastify.post('/connect/onboarding-link', async (req, res) => {
    return callTrpc(req, res, (c) => c.createOnboardingLink())
  })

  // ── Chef: get Connect account status ─────────────────────────────────────
  // GET /api/v1/payouts/connect/status
  fastify.get('/connect/status', async (req, res) => {
    return callTrpc(req, res, (c) => c.getConnectAccountStatus())
  })

  // ── Chef: get balance ─────────────────────────────────────────────────────
  // GET /api/v1/payouts/balance
  fastify.get('/balance', async (req, res) => {
    return callTrpc(req, res, (c) => c.getBalance())
  })

  // ── Chef: get earnings ledger ─────────────────────────────────────────────
  // GET /api/v1/payouts/earnings
  fastify.get('/earnings', async (req, res) => {
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.getEarnings({
      cursor: q['cursor'],
      limit:  q['limit'] ? parseInt(q['limit'], 10) : undefined,
      type:   q['type'] as any,
    }))
  })

  // ── Chef: list payout history ─────────────────────────────────────────────
  // GET /api/v1/payouts
  fastify.get('/', async (req, res) => {
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.getPayouts({
      cursor: q['cursor'],
      limit:  q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Chef: request payout ──────────────────────────────────────────────────
  // POST /api/v1/payouts/request
  fastify.post('/request', async (req, res) => {
    return callTrpc(req, res, (c) => c.requestPayout(req.body as any), 201)
  })

  // ── Admin: get any chef's balance ─────────────────────────────────────────
  // GET /api/v1/payouts/admin/balance/:chefId
  fastify.get('/admin/balance/:chefId', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    return callTrpc(req, res, (c) => c.adminGetChefBalance({ chefId }))
  })

  // ── Admin: list any chef's payouts ────────────────────────────────────────
  // GET /api/v1/payouts/admin/payouts/:chefId
  fastify.get('/admin/payouts/:chefId', async (req, res) => {
    const { chefId } = req.params as { chefId: string }
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.adminListPayouts({
      chefId,
      status: q['status'] as any,
      cursor: q['cursor'],
      limit:  q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Error handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _req, res) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) {
      fastify.log.error({ err: error }, 'Unhandled payout route error')
    }
    return res.code(httpResp.statusCode).send(httpResp)
  })
}
