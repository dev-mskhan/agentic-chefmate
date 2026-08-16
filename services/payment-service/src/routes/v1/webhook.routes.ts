import type { FastifyInstance } from 'fastify'
import { getStripe } from '../../services/stripe.service'
import { Payment } from '../../models/payment.model'
import { ProcessedWebhook } from '../../models/processed-webhook.model'
import { publishPaymentEvent } from '../../services/event.service'
import { config } from '../../config'
import { createLogger } from '@chefmate/logger'
import type Stripe from 'stripe'

const logger = createLogger('stripe-webhook')

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/webhook', {
    config: { rawBody: true },
  }, async (req, res) => {
    const sig = req.headers['stripe-signature'] as string | undefined
    if (!sig) return res.code(400).send({ error: 'Missing stripe-signature header' })

    let event: Stripe.Event
    try {
      event = getStripe().webhooks.constructEvent(
        (req as any).rawBody as Buffer,
        sig,
        config.STRIPE_WEBHOOK_SECRET,
      )
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Invalid Stripe webhook signature')
      return res.code(403).send({ error: 'Invalid signature' })
    }

    // ── Idempotency: skip already-processed events ───────────────────────────
    const alreadyProcessed = await ProcessedWebhook.findOne({ stripeEventId: event.id })
    if (alreadyProcessed) {
      logger.info({ stripeEventId: event.id }, 'Duplicate webhook — skipping')
      return res.code(200).send({ received: true })
    }

    // Mark processed BEFORE publishing to prevent duplicate events on crash
    await ProcessedWebhook.create({ stripeEventId: event.id, processedAt: new Date() })

    try {
      await handleStripeEvent(event)
    } catch (err) {
      logger.error({ err, stripeEventId: event.id }, 'Stripe webhook handler error')
      // Do not return 5xx — Stripe would retry and we already marked as processed
    }

    return res.code(200).send({ received: true })
  })
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent
      const payment = await Payment.findOne({ stripePaymentIntentId: intent.id })
      if (!payment) { logger.warn({ intentId: intent.id }, 'No payment found for intent'); return }
      if (payment.status === 'SUCCEEDED') return  // already handled

      payment.status = 'SUCCEEDED'
      await payment.save()

      await publishPaymentEvent({
        type: 'payment.succeeded',
        paymentId:  payment._id.toString(),
        orderId:    payment.orderId,
        customerId: payment.customerId,
        amount:     payment.amountCents,
        currency:   payment.currency,
        createdAt:  new Date().toISOString(),
        version:    '1',
      })
      logger.info({ orderId: payment.orderId }, 'Payment succeeded')
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const payment = await Payment.findOne({ stripePaymentIntentId: intent.id })
      if (!payment) return

      payment.status = 'FAILED'
      payment.failureReason = intent.last_payment_error?.message ?? 'Payment failed'
      await payment.save()

      await publishPaymentEvent({
        type: 'payment.failed',
        paymentId:  payment._id.toString(),
        orderId:    payment.orderId,
        customerId: payment.customerId,
        reason:     payment.failureReason,
        createdAt:  new Date().toISOString(),
        version:    '1',
      })
      logger.info({ orderId: payment.orderId }, 'Payment failed')
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (!intentId) return

      const payment = await Payment.findOne({ stripePaymentIntentId: intentId })
      if (!payment) return

      const refundedCents = charge.amount_refunded
      const isFullRefund   = refundedCents >= payment.amountCents

      payment.refundedAmountCents = refundedCents
      payment.status = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
      await payment.save()

      const latestRefund = charge.refunds?.data?.[0]
      const stripeRefundId = latestRefund?.id ?? 'unknown'

      if (isFullRefund) {
        await publishPaymentEvent({
          type: 'payment.refunded',
          paymentId:      payment._id.toString(),
          orderId:        payment.orderId,
          customerId:     payment.customerId,
          amount:         refundedCents,
          currency:       payment.currency,
          stripeRefundId,
          createdAt:      new Date().toISOString(),
          version:        '1',
        })
      } else {
        await publishPaymentEvent({
          type: 'payment.partially_refunded',
          paymentId:       payment._id.toString(),
          orderId:         payment.orderId,
          customerId:      payment.customerId,
          refundedAmount:  refundedCents,
          remainingAmount: payment.amountCents - refundedCents,
          currency:        payment.currency,
          stripeRefundId,
          createdAt:       new Date().toISOString(),
          version:         '1',
        })
      }
      break
    }

    default:
      logger.info({ type: event.type }, 'Unhandled Stripe event type — ignored')
  }
}
