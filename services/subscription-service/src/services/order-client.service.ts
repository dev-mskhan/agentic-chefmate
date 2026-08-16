import { config } from '../config'
import { InternalError } from '@chefmate/errors'

export interface RecurringOrderPayload {
  subscriptionId:  string
  customerId:      string
  customerEmail:   string
  chefId:          string
  deliveryDate:    string
  items:           Array<{ dishId: string; quantity: number }>
  addressSnapshot: {
    addressId: string; label: string; addressLine: string; area?: string
    city: string; province?: string; postalCode?: string
    location?: { type: 'Point'; coordinates: [number, number] }
    deliveryInstructions?: string
  }
  currency:        string
  idempotencyKey:  string
}

export interface RecurringOrderResult {
  orderId:      string
  paymentId:    string | null
  clientSecret: string | null
}

export async function createRecurringOrder(payload: RecurringOrderPayload): Promise<RecurringOrderResult> {
  const base = config.ORDER_SERVICE_URL
  const res = await fetch(`${base}/internal/subscriptions/orders`, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'X-Internal-Secret': config.INTERNAL_SECRET as string,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new InternalError(`Order service error ${res.status}: ${text}`)
  }

  const body = await res.json() as RecurringOrderResult
  return body
}
