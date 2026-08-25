/**
 * Internal payment creation endpoint.
 * Called by Order Service during checkout — NOT exposed to the public internet.
 * Authenticated via X-Internal-Secret header rather than customer JWT.
 */
import type { FastifyInstance } from 'fastify'
import { Payment } from '../../models/payment.model'
import { createPaymentIntent, confirmPaymentIntent } from '../../services/stripe.service'
import { publishPaymentEvent, publishConnectEvent } from '../../services/event.service'
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

  // ── Webhook simulate (dev/test only) ──────────────────────────────────────
  // Allows tests to simulate Stripe webhook events without real Stripe.
  // Guards on x-internal-secret so it's not publicly accessible (the gateway
  // strips that header, so this route is only reachable via direct calls).
  //
  // Supported events:
  //   payment_intent.succeeded   → payment.status = SUCCEEDED, publish payment.succeeded
  //   payment_intent.payment_failed → payment.status = FAILED, publish payment.failed
  //   charge.refunded            → payment.status = REFUNDED, publish payment.refunded
  //   charge.refunded.partial    → payment.status = PARTIALLY_REFUNDED, publish payment.partially_refunded
  //
  // Body: { orderId: string, event: string, amountCents?: number (for partial refund) }
  const simulateBody = z.object({
    orderId:     z.string().min(1),
    event:       z.enum([
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.refunded',
      'charge.refunded.partial',
      'charge.dispute.created',
    ]),
    amountCents: z.number().int().min(1).optional(), // for partial refund
    reason:      z.string().optional(),
  })

  fastify.post('/webhook/simulate', async (req, res) => {
    const secret = req.headers['x-internal-secret']
    if (secret !== config.INTERNAL_SECRET) {
      return res.code(403).send({ error: 'Forbidden' })
    }

    const parsed = simulateBody.safeParse(req.body)
    if (!parsed.success) {
      return res.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
    }
    const input = parsed.data

    const payment = await Payment.findOne({ orderId: input.orderId })
    if (!payment) {
      return res.code(404).send({ error: 'Payment not found for this order' })
    }

    const now = new Date().toISOString()
    const paymentId = payment._id.toString()

    switch (input.event) {
      case 'payment_intent.succeeded': {
        if (payment.status === 'SUCCEEDED') {
          return res.send({ received: true, message: 'Already succeeded' })
        }
        payment.status = 'SUCCEEDED'
        await payment.save()

        await publishPaymentEvent({
          type:       'payment.succeeded',
          paymentId, orderId: payment.orderId, customerId: payment.customerId,
          amount: payment.amountCents, currency: payment.currency,
          createdAt: now, version: '1',
        })
        logger.info({ orderId: payment.orderId }, 'Simulated payment.succeeded')
        break
      }

      case 'payment_intent.payment_failed': {
        payment.status = 'FAILED'
        payment.failureReason = input.reason ?? 'Simulated payment failure'
        await payment.save()

        await publishPaymentEvent({
          type:       'payment.failed',
          paymentId, orderId: payment.orderId, customerId: payment.customerId,
          reason: payment.failureReason,
          createdAt: now, version: '1',
        })
        logger.info({ orderId: payment.orderId }, 'Simulated payment.failed')
        break
      }

      case 'charge.refunded': {
        const refundAmount = input.amountCents ?? payment.amountCents
        payment.refundedAmountCents = refundAmount
        payment.status = refundAmount >= payment.amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
        await payment.save()

        await publishPaymentEvent({
          type: 'payment.refunded',
          paymentId, orderId: payment.orderId, customerId: payment.customerId,
          amount: refundAmount, currency: payment.currency,
          stripeRefundId: `re_sim_${Date.now()}`,
          createdAt: now, version: '1',
        })
        logger.info({ orderId: payment.orderId, refundAmount }, 'Simulated charge.refunded')
        break
      }

      case 'charge.refunded.partial': {
        const partialAmount = input.amountCents ?? Math.floor(payment.amountCents / 2)
        payment.refundedAmountCents = partialAmount
        payment.status = 'PARTIALLY_REFUNDED'
        await payment.save()

        await publishPaymentEvent({
          type: 'payment.partially_refunded',
          paymentId, orderId: payment.orderId, customerId: payment.customerId,
          refundedAmount: partialAmount,
          remainingAmount: payment.amountCents - partialAmount,
          currency: payment.currency,
          stripeRefundId: `re_sim_${Date.now()}`,
          createdAt: now, version: '1',
        })
        logger.info({ orderId: payment.orderId, partialAmount }, 'Simulated charge.refunded.partial')
        break
      }

      case 'charge.dispute.created': {
        await publishConnectEvent({
          type: 'connect.dispute_created',
          eventId: `evt_sim_dispute_${Date.now()}`,
          disputeId: `dp_sim_${Date.now()}`,
          chargeId: `ch_sim_${payment._id.toString()}`,
          paymentIntentId: payment.stripePaymentIntentId ?? '',
          paymentId: payment._id.toString(),
          amount: payment.amountCents,
          currency: payment.currency,
          reason: input.reason ?? 'fraudulent',
          createdAt: now,
          version: '1',
        })
        logger.info({ orderId: payment.orderId }, 'Simulated connect.dispute_created')
        break
      }
    }

    return res.code(200).send({ received: true, paymentId, status: payment.status })
  })

  // ── Confirm payment (dev/test only) ──────────────────────────────────────
  // Confirms a real Stripe PaymentIntent using the test card (pm_card_visa).
  // This triggers the actual Stripe webhook flow through ngrok — no mocking.
  // Guards on x-internal-secret so it's not publicly accessible.
  //
  // Body: { orderId: string }
  // Returns: { paymentIntentId, status }
  const confirmPaymentBody = z.object({
    orderId: z.string().min(1),
  })

  fastify.post('/confirm-payment', async (req, res) => {
    const secret = req.headers['x-internal-secret']
    if (secret !== config.INTERNAL_SECRET) {
      return res.code(403).send({ error: 'Forbidden' })
    }

    const parsed = confirmPaymentBody.safeParse(req.body)
    if (!parsed.success) {
      return res.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
    }
    const input = parsed.data

    const payment = await Payment.findOne({ orderId: input.orderId })
    if (!payment) {
      return res.code(404).send({ error: 'Payment not found for this order' })
    }
    if (!payment.stripePaymentIntentId) {
      return res.code(400).send({ error: 'Payment has no Stripe PaymentIntent ID' })
    }
    if (payment.status === 'SUCCEEDED') {
      return res.send({ paymentIntentId: payment.stripePaymentIntentId, status: 'succeeded' })
    }

    try {
      const result = await confirmPaymentIntent(payment.stripePaymentIntentId)
      logger.info({ orderId: input.orderId, paymentIntentId: result.id, status: result.status }, 'Payment confirmed via Stripe API')
      return res.send({ paymentIntentId: result.id, status: result.status })
    } catch (err: any) {
      logger.error({ err, orderId: input.orderId }, 'Failed to confirm payment via Stripe API')
      return res.code(500).send({ error: 'Stripe confirmation failed', message: err?.message ?? 'Unknown error' })
    }
  })
}
