/**
 * Helpers for Phase 7 Payout tests.
 * All requests go through the gateway using cookie auth.
 */
import type { APIRequestContext } from '@playwright/test'
import { signupViaGateway, ensureProfile, STRONG_PASSWORD, uniqueEmail } from './user'
import { setupActiveChef, chefPost } from './chef'

const PAYOUT_BASE  = '/api/v1/payouts'
const AUTH_TRPC    = '/api/v1/auth/trpc'
const ORDER_BASE   = '/api/v1/orders'

// Internal secret for simulate endpoint (payment-service .env)
export const INTERNAL_SECRET     = process.env['INTERNAL_SECRET'] ?? 'dev-internal-secret-min-16chars!'
const PAYMENT_SERVICE_URL = process.env['PAYMENT_SERVICE_URL'] ?? 'http://localhost:3008'
const ADMIN_EMAIL    = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

// ── Types ─────────────────────────────────────────────────────────────────

export interface PayoutChef {
  email:    string
  userId:   string
  chefId:   string
  dishId:   string
  password: string
  request:  APIRequestContext
}

export interface PayoutCustomer {
  email:     string
  userId:    string
  addressId: string
  password:  string
}

// ── Chef setup (separate context) ──────────────────────────────────────────

/**
 * Set up an active chef (CHEF role) in their own Playwright context.
 * Returns a context authenticated as that chef.
 */
export async function setupPayoutChef(): Promise<PayoutChef> {
  const { request: pw } = await import('@playwright/test')
  const chefReq = await pw.newContext({ baseURL: 'http://localhost:3000' })

  const chef = await setupActiveChef(chefReq)

  // Create an active dish for generating orders
  const dishRes = await chefPost(chefReq, '/me/dishes', {
    name:                   'Payout Test Biryani',
    description:            'For payout testing',
    price:                  20.00,
    currency:               'USD',
    cuisine:                'PAKISTANI',
    dietaryTags:            ['HALAL'],
    allergens:              [],
    preparationTimeMinutes: 30,
    minimumOrderQuantity:   1,
    maximumOrderQuantity:   10,
  })
  const dishId = dishRes.data._id ?? dishRes.data.id
  await chefPost(chefReq, `/me/dishes/${dishId}/activate`, {})

  // Set up availability schedule
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
  await chefReq.put('/api/v1/chefs/me/schedule', {
    data: {
      recurringDays: allDays.map((dayOfWeek) => ({
        dayOfWeek,
        windows: [{ openTime: '08:00', closeTime: '23:00' }],
        isActive: true,
      })),
    },
  })
  await chefReq.patch('/api/v1/chefs/me/schedule/capacity', {
    data: { maxOrdersPerDay: 20, prepTimeMinutes: 30, leadTimeHours: 1 },
  })

  return {
    email:   chef.email,
    userId:  chef.userId,
    chefId:  chef.chefId,
    dishId,
    password: STRONG_PASSWORD,
    request:  chefReq,
  }
}

// ── Customer setup ─────────────────────────────────────────────────────────

/**
 * Sign up a customer and add a default delivery address.
 */
export async function setupPayoutCustomer(
  request: APIRequestContext,
  prefix = 'payoutcust',
): Promise<PayoutCustomer> {
  const email    = uniqueEmail(prefix)
  const password = STRONG_PASSWORD
  const session  = await signupViaGateway(request, email, password)
  await ensureProfile(request, 'Payout', 'Customer')

  // Create address via user-service tRPC
  const addrRes = await request.post('/api/v1/users/trpc/createAddress', {
    data: { label: 'HOME', addressLine: '99 Payout Street', city: 'Islamabad', isDefault: true },
  })
  const addrJson = await addrRes.json().catch(() => null)
  const addressId = addrJson?.result?.data?._id ?? addrJson?._id ?? addrJson?.id

  return { email, userId: session.userId, addressId, password }
}

/**
 * Re-sign in an existing customer (fresh cookie on this context).
 */
export async function signinPayoutCustomer(
  request: APIRequestContext,
  email:   string,
  password: string = STRONG_PASSWORD,
): Promise<void> {
  const res = await request.post(`${AUTH_TRPC}/signin`, { data: { email, password } })
  if (res.status() !== 200) throw new Error(`Customer signin failed: ${res.status()}`)
}

// ── Admin context ──────────────────────────────────────────────────────────

export async function setupAdminContext(): Promise<APIRequestContext> {
  const { request: pw } = await import('@playwright/test')
  const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.post(`${AUTH_TRPC}/signin`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  if (res.status() !== 200) {
    await ctx.dispose()
    throw new Error(`Admin signin failed: ${res.status()}`)
  }
  return ctx
}

// ── Payout REST helpers (through gateway) ──────────────────────────────────

export async function payoutGet(
  request: APIRequestContext,
  path:    string,
): Promise<{ status: number; data: any }> {
  const res  = await request.get(`${PAYOUT_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function payoutPost(
  request: APIRequestContext,
  path:    string,
  body:    unknown = {},
): Promise<{ status: number; data: any }> {
  const res  = await request.post(`${PAYOUT_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

// ── Order + payment simulation helpers ───────────────────────────────────

/**
 * Place an order and simulate payment.succeeded so the order confirms
 * and payout-service credits the chef's ledger via the event consumer.
 * Returns { orderId, paymentId }.
 */
export async function placeAndPayOrder(
  customerRequest: APIRequestContext,
  chef: PayoutChef,
  customer: PayoutCustomer,
  deliveryDate = '2026-12-20',
): Promise<{ orderId: string; paymentId: string }> {
  // Checkout
  const coRes = await customerRequest.post(`${ORDER_BASE}/checkout`, {
    data: {
      chefId:       chef.chefId,
      deliveryDate,
      addressId:    customer.addressId,
      items:        [{ dishId: chef.dishId, quantity: 1 }],
    },
  })
  if (coRes.status() !== 201) {
    const body = await coRes.json().catch(() => null)
    throw new Error(`Checkout failed: ${coRes.status()} ${JSON.stringify(body)}`)
  }
  const coJson  = await coRes.json()
  const orderId  = (coJson.order ?? coJson)._id
  const paymentId = coJson.paymentId

  // Simulate payment.succeeded (direct to payment-service, bypassing gateway)
  const simRes = await fetch(`${PAYMENT_SERVICE_URL}/internal/webhook/simulate`, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ orderId, event: 'payment_intent.succeeded' }),
  })
  if (!simRes.ok) {
    const body = await simRes.json().catch(() => null)
    throw new Error(`Simulate webhook failed: ${simRes.status} ${JSON.stringify(body)}`)
  }

  // Mark order DELIVERED so payout-service gets the order.completed event
  // (order.completed is emitted by update-order-status when status → DELIVERED)
  // We need to step through the lifecycle: CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
  // Wait 1 s for payment.succeeded → order auto-CONFIRMED event propagation
  await new Promise((r) => setTimeout(r, 1500))

  const statusSteps = ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
  for (const status of statusSteps) {
    const patchRes = await chef.request.patch(`${ORDER_BASE}/${orderId}/status`, { data: { newStatus: status } })
    if (patchRes.status() !== 200) {
      const errBody = await patchRes.json().catch(() => null)
      throw new Error(`Order status patch to ${status} failed: ${patchRes.status()} ${JSON.stringify(errBody)}`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  return { orderId, paymentId }
}

/**
 * Simulate a refund event directly to payment-service.
 */
export async function simulateRefund(
  orderId:     string,
  partial      = false,
  amountCents?: number,
): Promise<void> {
  const event = partial ? 'charge.refunded.partial' : 'charge.refunded'
  const body: Record<string, unknown> = { orderId, event }
  if (amountCents !== undefined) body['amountCents'] = amountCents

  const res = await fetch(`${PAYMENT_SERVICE_URL}/internal/webhook/simulate`, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Simulate refund failed: ${res.status}`)
  }
}
