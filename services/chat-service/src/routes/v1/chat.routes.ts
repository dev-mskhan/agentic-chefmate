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

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Get or create thread for order ───────────────────────────────────────
  // GET /api/v1/chat/threads/:orderId
  fastify.get('/threads/:orderId', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (c) => c.getThread({ orderId }))
  })

  // ── Get my threads ────────────────────────────────────────────────────────
  // GET /api/v1/chat/threads
  fastify.get('/threads', async (req, res) => {
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.getMyThreads({
      page:  q['page'] ? parseInt(q['page'], 10) : undefined,
      limit: q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── List messages for a thread ────────────────────────────────────────────
  // GET /api/v1/chat/messages
  fastify.get('/messages', async (req, res) => {
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.listMessages({
      threadId: q['threadId'] ?? '',
      cursor:   q['cursor'],
      limit:    q['limit'] ? parseInt(q['limit'], 10) : undefined,
    }))
  })

  // ── Get unread count for a thread ──────────────────────────────────────────
  // GET /api/v1/chat/unread
  fastify.get('/unread', async (req, res) => {
    const q = req.query as Record<string, string>
    return callTrpc(req, res, (c) => c.getUnreadCount({
      threadId: q['threadId'] ?? '',
    }))
  })

  // ── Error handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _req, res) => {
    const httpResp = toHttpResponse(error)
    if (httpResp.statusCode >= 500) {
      fastify.log.error({ err: error }, 'Unhandled chat route error')
    }
    return res.code(httpResp.statusCode).send(httpResp)
  })
}
