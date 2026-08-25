import type { APIRequestContext } from '@playwright/test'
import { signupViaGateway, ensureProfile, utrpcPost, STRONG_PASSWORD, uniqueEmail } from './user'
import { setupActiveChef, chefPost, chefPut } from './chef'

const SUB_BASE = '/api/v1/subscriptions'
const AUTH_TRPC = '/api/v1/auth/trpc'
const PAYMENT_SERVICE_URL = process.env['PAYMENT_SERVICE_URL'] ?? 'http://localhost:3008'
const INTERNAL_SECRET = process.env['INTERNAL_SECRET'] ?? 'dev-internal-secret-min-16chars!'

export interface SubCustomer {
  email: string
  userId: string
  addressId: string
  password: string
}

export interface ChefWithPlan {
  email: string
  userId: string
  chefId: string
  planId: string
  tierId: string
  dish1Id: string
  dish2Id: string
  request: APIRequestContext
}

// ── Customer setup ────────────────────────────────────────────────────────
export async function setupSubCustomer(
  request: APIRequestContext,
  prefix = 'subcust',
): Promise<SubCustomer> {
  const email = uniqueEmail(prefix)
  const password = STRONG_PASSWORD
  const session = await signupViaGateway(request, email, password)
  await ensureProfile(request, 'Sub', 'Customer')
  const addrRes = await utrpcPost(request, 'createAddress', {
    label: 'HOME', addressLine: '12 Subscription Ave', city: 'Islamabad', isDefault: true,
  })
  if (addrRes.status !== 200 || !addrRes.data) {
    throw new Error(`createAddress failed: ${addrRes.status} ${JSON.stringify(addrRes.error)}`)
  }
  return { email, userId: session.userId, addressId: addrRes.data._id ?? addrRes.data.id, password }
}

export async function signinSubCustomer(
  request: APIRequestContext,
  email: string,
  password: string = STRONG_PASSWORD,
): Promise<void> {
  const res = await request.post(`${AUTH_TRPC}/signin`, { data: { email, password } })
  if (res.status() !== 200) throw new Error(`customer signin failed: ${res.status()}`)
}

// ── Chef with plan setup (separate context) ──────────────────────────────
export async function setupChefWithPlan(): Promise<ChefWithPlan> {
  const { request: pw } = await import('@playwright/test')
  const chefRequest = await pw.newContext({ baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:3000' })
  const chef = await setupActiveChef(chefRequest)

  // Schedule
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
  await chefRequest.put('/api/v1/chefs/me/schedule', {
    data: { recurringDays: allDays.map((d) => ({ dayOfWeek: d, windows: [{ openTime: '08:00', closeTime: '23:00' }], isActive: true })) },
  })
  await chefRequest.patch('/api/v1/chefs/me/schedule/capacity', {
    data: { maxOrdersPerDay: 50, prepTimeMinutes: 30, leadTimeHours: 1 },
  })

  // Dish 1
  const d1 = await chefPost(chefRequest, '/me/dishes', {
    name: 'Grilled Chicken Box', description: 'Healthy grilled chicken', price: 18.00,
    currency: 'USD', cuisine: 'CONTINENTAL', dietaryTags: ['HALAL'], allergens: [],
    preparationTimeMinutes: 30, minimumOrderQuantity: 1, maximumOrderQuantity: 10,
  })
  const dish1Id = d1.data._id ?? d1.data.id
  await chefPost(chefRequest, `/me/dishes/${dish1Id}/activate`, {})

  // Dish 2 (for swap)
  const d2 = await chefPost(chefRequest, '/me/dishes', {
    name: 'Herb Salmon & Rice', description: 'Pan-seared salmon', price: 22.00,
    currency: 'USD', cuisine: 'CONTINENTAL', dietaryTags: ['HALAL'], allergens: ['FISH'],
    preparationTimeMinutes: 35, minimumOrderQuantity: 1, maximumOrderQuantity: 10,
  })
  const dish2Id = d2.data._id ?? d2.data.id
  await chefPost(chefRequest, `/me/dishes/${dish2Id}/activate`, {})

  // Plan
  const p = await chefPost(chefRequest, '/me/plans', {
    name: 'Weekly Healthy Box', description: 'Weekly delivery of fresh meals',
    type: 'SUBSCRIPTION', frequency: 'WEEKLY', currency: 'USD', basePrice: 50.00,
    pauseRules: { allowPause: true, maxPauseDays: 30 },
    skipRules: { allowSkip: true, minNoticeHours: 1 },
    swapRules: { allowSwap: true, swapWindowHours: 1 },
  })
  const planId = p.data._id ?? p.data.id

  // Tier
  const t = await chefPut(chefRequest, `/me/plans/${planId}/tiers`, {
    tiers: [{ name: 'Standard', description: 'Standard tier', dishIds: [dish1Id, dish2Id], priceOverride: 50.00, portionsPerDish: 1 }],
  })
  const tierId = t.data.tiers?.[0]?._id ?? t.data.tiers?.[0]?.id

  // Activate plan
  await chefPost(chefRequest, `/me/plans/${planId}/activate`, {})

  return { email: chef.email, userId: chef.userId, chefId: chef.chefId, planId, tierId, dish1Id, dish2Id, request: chefRequest }
}

// ── Subscription REST helpers (through gateway) ──────────────────────────
export async function subPost(request: APIRequestContext, path: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await request.post(`${SUB_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

export async function subGet(request: APIRequestContext, path: string): Promise<{ status: number; data: any }> {
  const res = await request.get(`${SUB_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

// ── Confirm payment via Stripe API (real, no mock) ────────────────────────
export async function confirmPayment(orderId: string): Promise<{ status: number; data: any }> {
  const res = await fetch(`${PAYMENT_SERVICE_URL}/internal/confirm-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ orderId }),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, data: json }
}

// ─- Admin context helper ──────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

export async function setupAdminContext(): Promise<APIRequestContext> {
  const { request: pw } = await import('@playwright/test')
  const ctx = await pw.newContext({ baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:3000' })
  await ctx.post(`${AUTH_TRPC}/signin`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  return ctx
}
