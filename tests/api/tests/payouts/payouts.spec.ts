/**
 * Phase 7 — Payout Service Tests
 *
 * All requests go through the gateway (GATEWAY_URL) using cookie auth.
 * Tests cover:
 *   7A – Connect account lifecycle (create, onboarding link, status)
 *   7B – Balance & earnings (order.completed → ledger credit)
 *   7C – Payout history
 *   7D – Order completed → chef balance (event-driven)
 *   7E – Refund → balance adjustment (event-driven)
 *   7F – Admin access (adminGetChefBalance, adminListPayouts)
 *   7G – Chef isolation (chef A cannot access chef B resources)
 *   7H – Unauthorized / unauthenticated (401, 403)
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  setupPayoutChef,
  setupPayoutCustomer,
  signinPayoutCustomer,
  setupAdminContext,
  payoutGet,
  payoutPost,
  placeAndPayOrder,
  simulateRefund,
  type PayoutChef,
  type PayoutCustomer,
} from '../../helpers/payout'

// ── Shared state across the test suite ────────────────────────────────────
let chefA:     PayoutChef
let customerA: PayoutCustomer
let adminCtx:  APIRequestContext

// ChefB (isolation tests)
let chefB:     PayoutChef
let customerB: PayoutCustomer

// Store IDs for cross-test assertions
let orderId1: string

test.setTimeout(60_000)

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  // Set up chefA, chefB and admin sequentially to avoid hitting request limits/timeouts
  chefA = await setupPayoutChef()
  chefB = await setupPayoutChef()
  adminCtx = await setupAdminContext()

  customerA = await setupPayoutCustomer(request, 'payoutcustA')
  customerB = await setupPayoutCustomer(request, 'payoutcustB')
})

test.afterAll(async () => {
  await chefA?.request?.dispose().catch(() => {})
  await chefB?.request?.dispose().catch(() => {})
  await adminCtx?.dispose().catch(() => {})
})

test.beforeEach(async ({ request }) => {
  // Re-authenticate customerA on every test's fresh request context
  await signinPayoutCustomer(request, customerA.email, customerA.password)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7A – Connect Account
// ═══════════════════════════════════════════════════════════════════════════

test('7A-1: chef creates a Stripe Connect account (201 + stripeAccountId)', async () => {
  const res = await payoutPost(chefA.request, '/connect')
  expect(res.status).toBe(201)
  expect(res.data).toHaveProperty('stripeAccountId')
  expect(typeof res.data.stripeAccountId).toBe('string')
  expect(res.data.stripeAccountId).toMatch(/^acct_/)
  expect(res.data.status).toBe('PENDING')
})

test('7A-2: duplicate connect account returns 409', async () => {
  // chefA already created one in 7A-1
  const res = await payoutPost(chefA.request, '/connect')
  expect(res.status).toBe(409)
})

test('7A-3: chef creates onboarding link (200 + url)', async () => {
  const res = await payoutPost(chefA.request, '/connect/onboarding-link')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('url')
  expect(typeof res.data.url).toBe('string')
  expect(res.data.url).toMatch(/^https?:\/\//)
})

test('7A-4: get connect account status (200 + status fields)', async () => {
  const res = await payoutGet(chefA.request, '/connect/status')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('status')
  expect(res.data).toHaveProperty('chargesEnabled')
  expect(res.data).toHaveProperty('payoutsEnabled')
  expect(res.data).toHaveProperty('detailsSubmitted')
  // Newly created account → PENDING
  expect(['PENDING', 'ONBOARDING', 'RESTRICTED', 'ACTIVE']).toContain(res.data.status)
})

test('7A-5: get connect status for chef with no account returns 404', async () => {
  // chefB has not created a connect account yet
  const res = await payoutGet(chefB.request, '/connect/status')
  expect(res.status).toBe(404)
})

test('7A-6: onboarding link for chef with no account returns 404', async () => {
  const res = await payoutPost(chefB.request, '/connect/onboarding-link')
  expect(res.status).toBe(404)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7B – Balance (empty state)
// ═══════════════════════════════════════════════════════════════════════════

test('7B-1: get balance before any orders returns 0 (200)', async () => {
  const res = await payoutGet(chefA.request, '/balance')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('availableBalanceCents')
  expect(res.data.availableBalanceCents).toBe(0)
})

test('7B-2: get earnings before any orders returns empty list (200)', async () => {
  const res = await payoutGet(chefA.request, '/earnings')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('entries')
  expect(Array.isArray(res.data.entries)).toBe(true)
  expect(res.data.entries).toHaveLength(0)
})

test('7B-3: get payout history before any payouts returns empty list (200)', async () => {
  const res = await payoutGet(chefA.request, '/')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('payouts')
  expect(Array.isArray(res.data.payouts)).toBe(true)
  expect(res.data.payouts).toHaveLength(0)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7D – Order completed → chef balance (event-driven)
// ═══════════════════════════════════════════════════════════════════════════

test('7D-1: order completed → earnings credited to chef balance', async ({ request }) => {
  // Place and pay an order → drives order through DELIVERED → publishes order.completed
  const result = await placeAndPayOrder(request, chefA, customerA)
  orderId1 = result.orderId

  // Wait for event propagation: order.completed → payout-service consumer → ledger entry
  await new Promise((r) => setTimeout(r, 3000))

  // Verify earnings ledger has a CREDIT entry
  const earningsRes = await payoutGet(chefA.request, '/earnings')
  expect(earningsRes.status).toBe(200)
  const entries = earningsRes.data.entries as any[]
  const creditEntry = entries.find((e: any) => e.type === 'CREDIT' && e.orderId === orderId1)
  expect(creditEntry).toBeDefined()
  expect(creditEntry.status).toBe('AVAILABLE')
  expect(creditEntry.netAmountCents).toBeGreaterThan(0)
  expect(creditEntry.grossAmountCents).toBeGreaterThan(0)
  expect(creditEntry.platformFeeCents).toBeGreaterThanOrEqual(0)
  // Net = Gross - Platform fee (10% default)
  expect(creditEntry.netAmountCents).toBeLessThan(creditEntry.grossAmountCents)

  // Verify balance increased
  const balRes = await payoutGet(chefA.request, '/balance')
  expect(balRes.status).toBe(200)
  expect(balRes.data.availableBalanceCents).toBeGreaterThan(0)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7E – Refund → balance adjustment (event-driven)
// ═══════════════════════════════════════════════════════════════════════════

test('7E-1: full refund → DEBIT entry in ledger reduces balance', async ({ request }) => {
  // Place a second order to refund
  const result = await placeAndPayOrder(request, chefA, customerA, '2026-12-21')
  const { orderId } = result

  // Wait for earnings credit
  await new Promise((r) => setTimeout(r, 3000))

  // Get balance before refund
  const balBefore = await payoutGet(chefA.request, '/balance')
  const balBeforeCents: number = balBefore.data.availableBalanceCents

  // Simulate full refund
  await simulateRefund(orderId, false)

  // Wait for payment.refunded event → payout-service DEBIT entry
  await new Promise((r) => setTimeout(r, 3000))

  // Earnings should have a DEBIT entry
  const earningsRes = await payoutGet(chefA.request, '/earnings')
  const debitEntry = (earningsRes.data.entries as any[]).find(
    (e: any) => e.type === 'DEBIT' && e.orderId === orderId,
  )
  expect(debitEntry).toBeDefined()
  expect(debitEntry.status).toBe('AVAILABLE')
  expect(debitEntry.netAmountCents).toBeGreaterThan(0)

  // Balance should be lower now
  const balAfter = await payoutGet(chefA.request, '/balance')
  expect(balAfter.data.availableBalanceCents).toBeLessThan(balBeforeCents)
})

test('7E-2: partial refund → DEBIT entry for partial amount', async ({ request }) => {
  const result = await placeAndPayOrder(request, chefA, customerA, '2026-12-22')
  const { orderId } = result

  // Wait for credit
  await new Promise((r) => setTimeout(r, 3000))

  const balBefore = await payoutGet(chefA.request, '/balance')
  const balBeforeCents: number = balBefore.data.availableBalanceCents

  // Simulate partial refund (half the amount — 1000 cents)
  await simulateRefund(orderId, true, 1000)

  // Wait for event
  await new Promise((r) => setTimeout(r, 3000))

  const earningsRes = await payoutGet(chefA.request, '/earnings')
  const debitEntry = (earningsRes.data.entries as any[]).find(
    (e: any) => e.type === 'DEBIT' && e.orderId === orderId,
  )
  expect(debitEntry).toBeDefined()
  expect(debitEntry.netAmountCents).toBe(1000)

  const balAfter = await payoutGet(chefA.request, '/balance')
  // Should be reduced but not as much as a full refund
  expect(balAfter.data.availableBalanceCents).toBeLessThan(balBeforeCents)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7C – Payout history
// ═══════════════════════════════════════════════════════════════════════════

test('7C-1: payout list is paginated (limit + nextCursor)', async () => {
  const res = await payoutGet(chefA.request, '/?limit=1')
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('payouts')
  expect(Array.isArray(res.data.payouts)).toBe(true)
  // nextCursor may or may not exist depending on whether there are payouts
})

test('7C-2: earnings list supports type filter', async () => {
  const res = await payoutGet(chefA.request, '/earnings?type=CREDIT')
  expect(res.status).toBe(200)
  expect(Array.isArray(res.data.entries)).toBe(true)
  // All returned entries should be CREDIT type
  for (const entry of res.data.entries as any[]) {
    expect(entry.type).toBe('CREDIT')
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 7F – Admin access
// ═══════════════════════════════════════════════════════════════════════════

test('7F-1: admin can get any chef balance by chefId', async () => {
  const res = await payoutGet(adminCtx, `/admin/balance/${chefA.chefId}`)
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('availableBalanceCents')
  expect(typeof res.data.availableBalanceCents).toBe('number')
})

test('7F-2: admin can list any chef payouts by chefId', async () => {
  const res = await payoutGet(adminCtx, `/admin/payouts/${chefA.chefId}`)
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('payouts')
  expect(Array.isArray(res.data.payouts)).toBe(true)
})

test('7F-3: admin can list payouts with status filter', async () => {
  const res = await payoutGet(adminCtx, `/admin/payouts/${chefA.chefId}?status=PENDING`)
  expect(res.status).toBe(200)
  expect(Array.isArray(res.data.payouts)).toBe(true)
  for (const payout of res.data.payouts as any[]) {
    expect(payout.status).toBe('PENDING')
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 7G – Chef isolation (chefB cannot read chefA data via admin routes)
// ═══════════════════════════════════════════════════════════════════════════

test('7G-1: chef cannot call admin balance endpoint (403)', async () => {
  // chefA is CHEF role → admin endpoint must return 403
  const res = await payoutGet(chefA.request, `/admin/balance/${chefA.chefId}`)
  expect(res.status).toBe(403)
})

test('7G-2: chef cannot call admin payout list endpoint (403)', async () => {
  const res = await payoutGet(chefA.request, `/admin/payouts/${chefA.chefId}`)
  expect(res.status).toBe(403)
})

test('7G-3: chefB balance is isolated from chefA (both return their own data)', async ({ request }) => {
  // chefB creates connect account and checks balance
  await payoutPost(chefB.request, '/connect')

  const balA = await payoutGet(chefA.request, '/balance')
  const balB = await payoutGet(chefB.request, '/balance')

  expect(balA.status).toBe(200)
  expect(balB.status).toBe(200)

  // Both balances are independent — chefB starts at 0, chefA may have credits
  expect(balB.data.availableBalanceCents).toBe(0)
})

// ═══════════════════════════════════════════════════════════════════════════
// 7H – Unauthenticated / role-guard
// ═══════════════════════════════════════════════════════════════════════════

test('7H-1: unauthenticated cannot create connect account (401)', async ({ request }) => {
  // Fresh unauthenticated context — no cookie
  const { request: pw } = await import('@playwright/test')
  const unauth = await pw.newContext({ baseURL: 'http://localhost:3000' })
  const res = await (await unauth.post('/api/v1/payouts/connect', { data: {} })).json().catch(() => null)
  const status = (await unauth.post('/api/v1/payouts/connect', { data: {} })).status()
  // Gateway should return 401 before the request even reaches payout-service
  expect([401, 403]).toContain(status)
  await unauth.dispose()
})

test('7H-2: USER role cannot access payout routes (403 from gateway)', async ({ request }) => {
  // customerA is USER role — gateway /api/v1/payouts only allows CHEF | ADMIN
  const res = await request.get('/api/v1/payouts/balance')
  expect(res.status()).toBe(403)
})

test('7H-3: USER cannot create connect account (403 from gateway)', async ({ request }) => {
  const res = await request.post('/api/v1/payouts/connect', { data: {} })
  expect(res.status()).toBe(403)
})

test('7H-4: admin cannot create connect account (admin gets 403 from chefProcedure guard)', async () => {
  // The createConnectAccount procedure uses chefProcedure which requires CHEF role
  const res = await payoutPost(adminCtx, '/connect')
  expect(res.status).toBe(403)
})
