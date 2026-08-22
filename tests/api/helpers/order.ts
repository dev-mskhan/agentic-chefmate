import type { APIRequestContext } from '@playwright/test'
import { signupViaGateway, ensureProfile, utrpcPost, STRONG_PASSWORD } from './user'
import { setupActiveChef, uniqueEmail, chefPost } from './chef'

/**
 * Shared helpers for order + payment tests (Phase 5).
 * All requests go through the gateway. Cookie auth is used:
 *   - Customer: USER cookie on the main request context
 *   - Chef: separate Playwright context authenticated as CHEF
 */

const ORDER_BASE = '/api/v1/orders'
const PAYMENT_BASE = '/api/v1/payments'
const AUTH_TRPC = '/api/v1/auth/trpc'

export interface CustomerSession {
  email: string
  userId: string
  addressId: string
}

export interface ChefFixture {
  email: string
  userId: string
  chefId: string
  dishId: string
  /** Separate Playwright context authenticated as CHEF — use for chef order operations */
  request: APIRequestContext
}

export interface CustomerSession {
  email: string
  userId: string
  addressId: string
  password: string
}

// ── Customer setup ────────────────────────────────────────────────────────

/** Sign up a customer and create a default delivery address via the gateway. */
export async function setupCustomer(
  request: APIRequestContext,
  prefix = 'cust',
): Promise<CustomerSession> {
  const email = uniqueEmail(prefix)
  const password = STRONG_PASSWORD
  const session = await signupViaGateway(request, email, password)
  await ensureProfile(request, 'Test', 'Customer')

  // Create a delivery address via user-service tRPC (through the gateway)
  const addrRes = await utrpcPost(request, 'createAddress', {
    label: 'HOME',
    addressLine: '123 Test Street',
    city: 'Islamabad',
    isDefault: true,
  })
  if (addrRes.status !== 200 || !addrRes.data) {
    throw new Error(`createAddress failed: ${addrRes.status} ${JSON.stringify(addrRes.error)}`)
  }
  const addressId = addrRes.data._id ?? addrRes.data.id

  return { email, userId: session.userId, addressId, password }
}

/** Re-signin as an existing customer to set the access cookie on a fresh request context. */
export async function signinCustomer(
  request: APIRequestContext,
  email: string,
  password: string = STRONG_PASSWORD,
): Promise<void> {
  const res = await request.post(`${AUTH_TRPC}/signin`, { data: { email, password } })
  if (res.status() !== 200) {
    throw new Error(`customer signin failed: ${res.status()}`)
  }
}

// ── Chef setup (separate context) ─────────────────────────────────────────

/** Set up an active chef with a dish in a SEPARATE Playwright context. */
export async function setupChefWithDish(): Promise<ChefFixture> {
  const { request: pw } = await import('@playwright/test')
  const chefRequest = await pw.newContext({ baseURL: 'http://localhost:3000' })

  const chef = await setupActiveChef(chefRequest)

  // Create and activate a dish
  const dishRes = await chefPost(chefRequest, '/me/dishes', {
    name: 'Test Biryani',
    description: 'Aromatic rice dish for testing',
    price: 15.00,
    currency: 'USD',
    portionInfo: '1 person',
    cuisine: 'PAKISTANI',
    dietaryTags: ['HALAL'],
    allergens: [],
    preparationTimeMinutes: 45,
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 10,
  })
  const dishId = dishRes.data._id ?? dishRes.data.id

  // Activate the dish
  await chefPost(chefRequest, `/me/dishes/${dishId}/activate`, {})

  // Set up schedule (all days available)
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
  await chefRequest.put('/api/v1/chefs/me/schedule', {
    data: {
      recurringDays: allDays.map((dayOfWeek) => ({
        dayOfWeek,
        windows: [{ openTime: '08:00', closeTime: '23:00' }],
        isActive: true,
      })),
    },
  })
  await chefRequest.patch('/api/v1/chefs/me/schedule/capacity', {
    data: { maxOrdersPerDay: 2, prepTimeMinutes: 30, leadTimeHours: 1 },
  })

  return { email: chef.email, userId: chef.userId, chefId: chef.chefId, dishId, request: chefRequest }
}

// ── Order REST helpers (through gateway) ──────────────────────────────────

export async function orderPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`${ORDER_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function orderGet(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await request.get(`${ORDER_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function orderPatch(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.patch(`${ORDER_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

// ── Checkout helper ───────────────────────────────────────────────────────

export interface CheckoutResult {
  orderId: string
  paymentId: string
  clientSecret: string
}

/** Perform checkout through the gateway. Returns orderId + paymentId. */
export async function checkout(
  request: APIRequestContext,
  chef: ChefFixture,
  customer: CustomerSession,
  deliveryDate = '2026-12-15',
  quantity = 1,
  extra: Record<string, unknown> = {},
): Promise<CheckoutResult> {
  const res = await orderPost(request, '/checkout', {
    chefId: chef.chefId,
    deliveryDate,
    addressId: customer.addressId,
    items: [{ dishId: chef.dishId, quantity }],
    ...extra,
  })
  if (res.status !== 201) {
    throw new Error(`checkout failed: ${res.status} ${JSON.stringify(res.data)}`)
  }
  const order = res.data.order ?? res.data
  return {
    orderId: order._id,
    paymentId: res.data.paymentId,
    clientSecret: res.data.clientSecret,
  }
}

// ── Payment REST helpers (through gateway) ────────────────────────────────

export async function paymentGet(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await request.get(`${PAYMENT_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function paymentPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`${PAYMENT_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

// ── Webhook simulate (direct to payment-service, bypasses gateway) ────────

const PAYMENT_SERVICE_URL = process.env['PAYMENT_SERVICE_URL'] ?? 'http://localhost:3008'
const INTERNAL_SECRET = process.env['INTERNAL_SECRET'] ?? 'dev-internal-secret-min-16chars!'

/** Simulate a Stripe webhook event directly to payment-service internal route. */
export async function simulateWebhook(
  orderId: string,
  event: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'charge.refunded' | 'charge.refunded.partial',
  extra: Record<string, unknown> = {},
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${PAYMENT_SERVICE_URL}/internal/webhook/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ orderId, event, ...extra }),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, data: json }
}

// ─- Admin context helper ──────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

/** Create a separate Playwright context authenticated as ADMIN. */
export async function setupAdminContext(): Promise<APIRequestContext> {
  const { request: pw } = await import('@playwright/test')
  const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
  const signinRes = await ctx.post(`${AUTH_TRPC}/signin`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  if (signinRes.status() !== 200) {
    await ctx.dispose()
    throw new Error(`admin signin failed: ${signinRes.status()}`)
  }
  return ctx
}
