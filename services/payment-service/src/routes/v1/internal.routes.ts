/**
 * Internal payment creation endpoint.
 * Called by Order Service during checkout — NOT exposed to the public internet.
 * Authenticated via X-Internal-Secret header rather than customer JWT.
 */
import type { FastifyInstance } from 'fastify'
import { Payment } from '../../models/payment.model'
import { createPaymentIntent } from '../../services/stripe.service'
import { publishPaymentEvent } from '../../services/event.service'
import { config } from '../../config'
import { createLogger } from '@chefmate/logger'
import { z } from 'zod'

const logger = createLogger('internal-payments')

const createPaymentBody = z.object({
  orderId:        z.string().min(1),
  customerId:     z.string().min(1),
  amountCents:    z.number().int().min(1),
  currency:       z.string().min(1),
  idempotencyKey: z.string().optional(),
})

export async function internalRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/payments', async (req, res) => {
    // Verify internal secret
    const secret = req.headers['x-internal-secret']
    if (secret !== config.INTERNAL_SECRET) {
      return res.code(403).send({ error: 'Forbidden' })
    }

    const parsed = createPaymentBody.safeParse(req.body)
    if (!parsed.success) {
      return res.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
    }
    const input = parsed.data

    // Idempotency: return existing payment for same order
    const existing = await Payment.findOne({ orderId: input.orderId })
    if (existing) {
      logger.info({ orderId: input.orderId }, 'Returning existing payment for idempotent request')
      return res.send({ paymentId: existing._id.toString(), clientSecret: existing.stripeClientSecret ?? '' })
    }

    // Create Stripe PaymentIntent
    const intent = await createPaymentIntent(
      input.amountCents,
      input.currency,
      { orderId: input.orderId, customerId: input.customerId },
      input.idempotencyKey,
    )

    // Persist payment record
    const payment = await Payment.create({
      orderId:               input.orderId,
      customerId:            input.customerId,
      amountCents:           input.amountCents,
      currency:              input.currency,
      status:                'PENDING',
      provider:              'STRIPE',
      stripePaymentIntentId: intent.id,
      stripeClientSecret:    intent.client_secret,
      metadata:              { idempotencyKey: input.idempotencyKey },
    })

    logger.info({ orderId: input.orderId, paymentId: payment._id.toString() }, 'Payment created')

    await publishPaymentEvent({
      type:       'payment.created',
      paymentId:  payment._id.toString(),
      orderId:    payment.orderId,
      customerId: payment.customerId,
      amount:     payment.amountCents,
      currency:   payment.currency,
      createdAt:  new Date().toISOString(),
      version:    '1',
    })

    return res.code(201).send({
      paymentId:    payment._id.toString(),
      clientSecret: intent.client_secret,
    })
  })
}
