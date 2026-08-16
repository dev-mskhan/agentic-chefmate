import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as http from 'http'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

async function callTrpc<T>(req: FastifyRequest, res: FastifyReply, fn: (c: ReturnType<typeof makeCaller>) => Promise<T>): Promise<void> {
  try {
    const result = await fn(makeCaller(req, res))
    return res.send(result)
  } catch (err: any) {
    const domainErr = err?.cause ?? err
    const codeMap: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, BAD_REQUEST: 400 }
    const statusCode: number = domainErr?.statusCode ?? codeMap[err?.code ?? ''] ?? 500
    const message: string = domainErr?.message ?? err?.message ?? 'Internal server error'
    return res.code(statusCode).send({ statusCode, message, error: http.STATUS_CODES[statusCode] ?? 'Error' })
  }
}

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/:paymentId', async (req, res) => {
    const { paymentId } = req.params as { paymentId: string }
    return callTrpc(req, res, (c) => c.getPayment({ paymentId }))
  })

  fastify.get('/status/:orderId', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (c) => c.getPaymentStatus({ orderId }))
  })

  fastify.post('/admin/refund', async (req, res) => {
    return callTrpc(req, res, (c) => c.createRefund(req.body as any))
  })

  fastify.setErrorHandler((error, _req, res) => {
    if (isDomainError(error)) return res.code(error.statusCode).send(toHttpResponse(error))
    fastify.log.error({ err: error }, 'Unhandled payment route error')
    return res.code(500).send(toHttpResponse(error))
  })
}
