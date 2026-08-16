import { config } from '../config'
import { InternalError } from '@chefmate/errors'

export interface CreatePaymentResult {
  paymentId:    string
  clientSecret: string
}

export async function createPaymentForOrder(
  orderId:        string,
  customerId:     string,
  amountCents:    number,
  currency:       string,
  idempotencyKey?: string,
): Promise<CreatePaymentResult> {
  const base = config.PAYMENT_SERVICE_URL
  const res = await fetch(`${base}/internal/payments`, {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'X-Internal-Secret':    config.INTERNAL_SECRET as string,
    },
    body: JSON.stringify({ orderId, customerId, amountCents, currency, idempotencyKey }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new InternalError(`Payment service error ${res.status}: ${text}`)
  }
  const body = await res.json() as { paymentId: string; clientSecret: string }
  return { paymentId: body.paymentId, clientSecret: body.clientSecret }
}
