import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as http from 'http'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse } from '@chefmate/errors'

function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

async function callTrpc<T>(req: FastifyRequest, res: FastifyReply, fn: (c: ReturnType<typeof makeCaller>) => Promise<T>, successCode: number = 200): Promise<void> {
  try {
    const result = await fn(makeCaller(req, res))
    return res.code(successCode).send(result)
  } catch (err: any) {
    const domainErr = err?.cause ?? err
    const codeMap: Record<string, number> = {
      UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
      BAD_REQUEST: 400, CONFLICT: 409, UNPROCESSABLE_CONTENT: 422,
    }
    const statusCode: number = domainErr?.statusCode ?? codeMap[err?.code ?? ''] ?? 500
    const message: string = domainErr?.message ?? err?.message ?? 'Internal server error'
    return res.code(statusCode).send({ statusCode, message, error: http.STATUS_CODES[statusCode] ?? 'Error' })
  }
}

export async function subscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  // POST / → createSubscription
  fastify.post('/', async (req, res) => {
    return callTrpc(req, res, (c) => c.createSubscription(req.body as any), 201)
  })

  // GET /my → listMySubscriptions
  fastify.get('/my', async (req, res) => {
    const query = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.listMySubscriptions({
      status: query['status'] as any,
      limit:  query['limit']  ? parseInt(query['limit'],  10) : undefined,
      offset: query['offset'] ? parseInt(query['offset'], 10) : undefined,
    }))
  })

  // GET /:subscriptionId → getSubscription
  fastify.get('/:subscriptionId', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.getSubscription({ subscriptionId }))
  })

  // POST /:subscriptionId/pause → pauseSubscription
  fastify.post('/:subscriptionId/pause', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.pauseSubscription({ subscriptionId }))
  })

  // POST /:subscriptionId/resume → resumeSubscription
  fastify.post('/:subscriptionId/resume', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.resumeSubscription({ subscriptionId }))
  })

  // POST /:subscriptionId/skip → skipSubscription
  fastify.post('/:subscriptionId/skip', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.skipSubscription({ subscriptionId }))
  })

  // POST /:subscriptionId/swap → swapSubscriptionDish
  fastify.post('/:subscriptionId/swap', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.swapSubscriptionDish({ subscriptionId, ...(req.body as any) }))
  })

  // POST /:subscriptionId/cancel → cancelSubscription
  fastify.post('/:subscriptionId/cancel', async (req, res) => {
    const { subscriptionId } = req.params as { subscriptionId: string }
    return callTrpc(req, res, (c) => c.cancelSubscription({ subscriptionId, ...(req.body as any) }))
  })

  fastify.setErrorHandler((error, _req, res) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) {
      fastify.log.error({ err: error }, 'Unhandled subscription route error')
    }
    return res.code(httpResp.statusCode).send(httpResp)
  })
}
