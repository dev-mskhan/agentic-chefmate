import Stripe from 'stripe'
import { config } from '../config'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  }
  return _stripe
}

export async function createPaymentIntent(
  amountCents: number,
  currency:    string,
  metadata:    Record<string, string>,
  idempotencyKey?: string,
): Promise<{ id: string; client_secret: string }> {
  const options: Stripe.RequestOptions = {}
  if (idempotencyKey) options.idempotencyKey = `pi_${idempotencyKey}`

  const intent = await getStripe().paymentIntents.create(
    { amount: amountCents, currency: currency.toLowerCase(), metadata, automatic_payment_methods: { enabled: true } },
    options,
  )

  return { id: intent.id, client_secret: intent.client_secret ?? '' }
}

export async function createRefund(
  paymentIntentId: string,
  amountCents?:    number,
): Promise<{ id: string; amount: number; status: string }> {
  const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId }
  if (amountCents !== undefined) params.amount = amountCents

  const refund = await getStripe().refunds.create(params)
  return { id: refund.id, amount: refund.amount, status: refund.status ?? 'unknown' }
}
