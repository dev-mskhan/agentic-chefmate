import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as http from 'http'
import { appRouter } from '../../trpc/router'
import { createContext } from '../../trpc/context'
import { toHttpResponse, isDomainError } from '@chefmate/errors'

function makeCaller(req: FastifyRequest, res: FastifyReply) {
  return appRouter.createCaller(createContext({ req, res }))
}

async function callTrpc<T>(
  req: FastifyRequest,
  res: FastifyReply,
  fn: (caller: ReturnType<typeof makeCaller>) => Promise<T>,
): Promise<void> {
  try {
    const caller = makeCaller(req, res)
    const result = await fn(caller)
    return res.send(result)
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

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {

  // ── Customer: create order ────────────────────────────────────────────────
  // POST /api/v1/orders
  fastify.post('/', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createOrder(req.body as any)
    return res.code(201).send(result)
  })

  // ── Customer: get my order ────────────────────────────────────────────────
  // GET /api/v1/orders/my/:orderId
  fastify.get('/my/:orderId', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (caller) => caller.getMyOrder({ orderId }))
  })

  // ── Customer: list my orders ──────────────────────────────────────────────
  // GET /api/v1/orders/my
  fastify.get('/my', async (req, res) => {
    const query = req.query as Record<string, string>
    return callTrpc(req, res, (caller) =>
      caller.listMyOrders({
        status: query['status'] as any,
        limit:  query['limit']  ? parseInt(query['limit'],  10) : undefined,
        offset: query['offset'] ? parseInt(query['offset'], 10) : undefined,
      }),
    )
  })

  // ── Customer: cancel order ────────────────────────────────────────────────
  // POST /api/v1/orders/:orderId/cancel
  fastify.post('/:orderId/cancel', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (caller) =>
      caller.cancelOrder({ orderId, ...(req.body as any) }),
    )
  })

  // ── Chef: list chef orders ────────────────────────────────────────────────
  // GET /api/v1/orders/chef
  fastify.get('/chef', async (req, res) => {
    const query = req.query as Record<string, string>
    return callTrpc(req, res, (caller) =>
      caller.listChefOrders({
        status:       query['status'] as any,
        deliveryDate: query['deliveryDate'],
        limit:  query['limit']  ? parseInt(query['limit'],  10) : undefined,
        offset: query['offset'] ? parseInt(query['offset'], 10) : undefined,
      }),
    )
  })

  // ── Chef: get single order ────────────────────────────────────────────────
  // GET /api/v1/orders/chef/:orderId
  fastify.get('/chef/:orderId', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (caller) => caller.getChefOrder({ orderId }))
  })

  // ── Chef: update order status ─────────────────────────────────────────────
  // PATCH /api/v1/orders/:orderId/status
  fastify.patch('/:orderId/status', async (req, res) => {
    const { orderId } = req.params as { orderId: string }
    return callTrpc(req, res, (caller) =>
      caller.updateOrderStatus({ orderId, ...(req.body as any) }),
    )
  })

  // ── Checkout ─────────────────────────────────────────────────────────────
  // POST /api/v1/orders/checkout
  fastify.post('/checkout', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.checkout(req.body as any)
    return res.code(201).send(result)
  })

  // POST /api/v1/orders/checkout/preview
  fastify.post('/checkout/preview', async (req, res) => {
    return callTrpc(req, res, (caller) => caller.checkoutPreview(req.body as any))
  })

  // ── Coupon validation (customer-facing) ───────────────────────────────────
  // GET /api/v1/orders/coupons/validate
  fastify.get('/coupons/validate', async (req, res) => {
    const query = req.query as Record<string, string>
    return callTrpc(req, res, (caller) =>
      caller.validateCoupon({
        couponCode: query['couponCode']!,
        subtotal:   parseFloat(query['subtotal'] ?? '0'),
        chefId:     query['chefId'],
      }),
    )
  })

  // ── Admin coupon endpoints ────────────────────────────────────────────────
  // POST /api/v1/orders/admin/coupons
  fastify.post('/admin/coupons', async (req, res) => {
    const caller = makeCaller(req, res)
    const result = await caller.createCoupon(req.body as any)
    return res.code(201).send(result)
  })

  // PATCH /api/v1/orders/admin/coupons/:couponId
  fastify.patch('/admin/coupons/:couponId', async (req, res) => {
    const { couponId } = req.params as { couponId: string }
    return callTrpc(req, res, (caller) =>
      caller.updateCoupon({ couponId, ...(req.body as any) }),
    )
  })

  // POST /api/v1/orders/admin/coupons/:couponId/deactivate
  fastify.post('/admin/coupons/:couponId/deactivate', async (req, res) => {
    const { couponId } = req.params as { couponId: string }
    return callTrpc(req, res, (caller) => caller.deactivateCoupon({ couponId }))
  })

  // GET /api/v1/orders/admin/coupons
  fastify.get('/admin/coupons', async (req, res) => {
    const query = req.query as Record<string, string>
    return callTrpc(req, res, (caller) =>
      caller.listCoupons({
        isActive: query['isActive'] !== undefined ? query['isActive'] === 'true' : undefined,
        limit:    query['limit']  ? parseInt(query['limit'],  10) : undefined,
        offset:   query['offset'] ? parseInt(query['offset'], 10) : undefined,
      }),
    )
  })

  // GET /api/v1/orders/admin/coupons/:couponId
  fastify.get('/admin/coupons/:couponId', async (req, res) => {
    const { couponId } = req.params as { couponId: string }
    return callTrpc(req, res, (caller) => caller.getCoupon({ couponId }))
  })

  // ── Error handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _req, res) => {
    if (isDomainError(error)) {
      return res.code(error.statusCode).send(toHttpResponse(error))
    }
    fastify.log.error({ err: error }, 'Unhandled order route error')
    return res.code(500).send(toHttpResponse(error))
  })
}
