/**
 * Helpers for Phase 8 Review tests.
 * All requests go through the gateway using cookie auth.
 */
import type { APIRequestContext } from '@playwright/test'
import { signupViaGateway, ensureProfile, STRONG_PASSWORD, uniqueEmail } from './user'
import { setupActiveChef, chefPost } from './chef'

const REVIEW_BASE  = '/api/v1/reviews'
const AUTH_TRPC    = '/api/v1/auth/trpc'
const ORDER_BASE   = '/api/v1/orders'

export const INTERNAL_SECRET     = process.env['INTERNAL_SECRET'] ?? 'dev-internal-secret-min-16chars!'
const PAYMENT_SERVICE_URL = process.env['PAYMENT_SERVICE_URL'] ?? 'http://localhost:3008'
const ADMIN_EMAIL    = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ReviewChef {
  email:    string
  userId:   string
  chefId:   string
  dishId:   string
  planId:   string
  password: string
  request:  APIRequestContext
}

export interface ReviewCustomer {
  email:     string
  userId:    string
  addressId: string
  password:  string
}

// ── Chef setup (separate context) ──────────────────────────────────────────

export async function setupReviewChef(): Promise<ReviewChef> {
  const { request: pw } = await import('@playwright/test')
  const chefReq = await pw.newContext({ baseURL: 'http://localhost:3000' })

  const chef = await setupActiveChef(chefReq)

  // 1. Create an active dish
  const dishRes = await chefPost(chefReq, '/me/dishes', {
    name:                   'Review Test Biryani',
    description:            'For review testing',
    price:                  25.00,
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

  // 2. Create an active meal plan with the dish
  const planRes = await chefPost(chefReq, '/me/plans', {
    name:        'Review Test Weekly Plan',
    description: 'Weekly delicious meals',
    type:        'SUBSCRIPTION',
    frequency:   'WEEKLY',
    tiers:       [{ name: 'Standard', price: 99.00, dishIds: [dishId] }],
  })
  const planId = planRes.data._id ?? planRes.data.id
  await chefPost(chefReq, `/me/plans/${planId}/activate`, {})

  // 3. Set schedule & capacity
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
    planId,
    password: STRONG_PASSWORD,
    request:  chefReq,
  }
}

// ── Customer setup ─────────────────────────────────────────────────────────

export async function setupReviewCustomer(
  request: APIRequestContext,
  prefix = 'revcust',
): Promise<ReviewCustomer> {
  const email    = uniqueEmail(prefix)
  const password = STRONG_PASSWORD
  const session  = await signupViaGateway(request, email, password)
  await ensureProfile(request, 'Review', 'Customer')

  const addrRes = await request.post('/api/v1/users/trpc/createAddress', {
    data: { label: 'HOME', addressLine: '123 Review Way', city: 'Lahore', isDefault: true },
  })
  const addrJson = await addrRes.json().catch(() => null)
  const addressId = addrJson?.result?.data?._id ?? addrJson?._id ?? addrJson?.id

  return { email, userId: session.userId, addressId, password }
}

export async function signinReviewCustomer(
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

// ── Review REST helpers ──────────────────────────────────────────────────

export async function reviewGet(
  request: APIRequestContext,
  path:    string,
): Promise<{ status: number; data: any }> {
  const res  = await request.get(`${REVIEW_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function reviewPost(
  request: APIRequestContext,
  path:    string,
  body:    unknown = {},
): Promise<{ status: number; data: any }> {
  const res  = await request.post(`${REVIEW_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

// ── Order placement + status progression ───────────────────────────────

export async function placePayAndDeliverOrder(
  customerRequest: APIRequestContext,
  chef: ReviewChef,
  customer: ReviewCustomer,
  deliveryDate = '2026-12-25',
): Promise<{ orderId: string; paymentId: string }> {
  // 1. Checkout
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
  const coJson   = await coRes.json()
  const orderId  = (coJson.order ?? coJson)._id
  const paymentId = coJson.paymentId

  // 2. Simulate payment.succeeded
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

  // 3. Step status through DELIVERED
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
