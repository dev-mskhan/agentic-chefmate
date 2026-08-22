import { test, expect } from '@playwright/test'
import {
  setupCustomer,
  setupChefWithDish,
  checkout,
  orderGet,
  paymentGet,
  paymentPost,
  simulateWebhook,
  setupAdminContext,
  signinCustomer,
  type ChefFixture,
  type CustomerSession,
} from '../../helpers/order'
import { signupViaGateway } from '../../helpers/user'
import { uniqueEmail } from '../../helpers/chef'

// ── Shared fixtures ───────────────────────────────────────────────────────
let chef: ChefFixture
let customer: CustomerSession

test.beforeAll(async ({ request }) => {
  chef = await setupChefWithDish()
  customer = await setupCustomer(request, 'pmt')
})

test.afterAll(async () => {
  if (chef?.request) {
    try { await (chef.request as any).dispose?.() } catch { /* noop */ }
  }
})

test.beforeEach(async ({ request }) => {
  await signinCustomer(request, customer.email, customer.password)
})

test.describe('Phase 5 — Payment Service (via Gateway)', () => {

  // ── 1. Payment creation (via checkout) ──────────────────────────────────
  test('1. Payment creation — checkout returns paymentId, getPayment returns details', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-01')
    expect(co.paymentId).toBeTruthy()

    const res = await paymentGet(request, `/${co.paymentId}`)
    expect(res.status).toBe(200)
    expect(res.data._id ?? res.data.id).toBe(co.paymentId)
    expect(res.data.customerId).toBe(customer.userId)
    expect(res.data.amountCents).toBe(1500) // 1 × $15.00 = 1500 cents
    expect(res.data.currency).toBe('USD')
    expect(['PENDING', 'PROCESSING', 'SUCCEEDED']).toContain(res.data.status)
  })

  // ── 2. Payment status by orderId ────────────────────────────────────────
  test('2. getPaymentStatus by orderId — 200', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-02')
    const res = await paymentGet(request, `/status/${co.orderId}`)
    expect(res.status).toBe(200)
    expect(['PENDING', 'PROCESSING', 'SUCCEEDED']).toContain(res.data.status)
    expect(res.data.amountCents).toBeGreaterThan(0)
    expect(res.data.currency).toBeDefined()
  })

  // ── 3. Webhook simulate: payment_intent.succeeded ───────────────────────
  test('3. Webhook simulate — payment_intent.succeeded → payment SUCCEEDED, order CONFIRMED', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-03')

    // Simulate Stripe webhook
    const simRes = await simulateWebhook(co.orderId, 'payment_intent.succeeded')
    expect(simRes.status).toBe(200)
    expect(simRes.data.status).toBe('SUCCEEDED')

    // Payment should now be SUCCEEDED
    const payRes = await paymentGet(request, `/status/${co.orderId}`)
    expect(payRes.status).toBe(200)
    expect(payRes.data.status).toBe('SUCCEEDED')

    // Wait for the order-service payment consumer to process the event
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Order should have auto-confirmed (PENDING → CONFIRMED) via payment.succeeded event
    const orderRes = await orderGet(request, `/my/${co.orderId}`)
    expect(orderRes.status).toBe(200)
    expect(orderRes.data.status).toBe('CONFIRMED')
  })

  // ── 4. Duplicate webhook idempotency ────────────────────────────────────
  test('4. Duplicate webhook simulate — second call is idempotent', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-04')

    // First webhook
    const sim1 = await simulateWebhook(co.orderId, 'payment_intent.succeeded')
    expect(sim1.status).toBe(200)
    expect(sim1.data.status).toBe('SUCCEEDED')

    // Second webhook — should return 200 without error (idempotent)
    const sim2 = await simulateWebhook(co.orderId, 'payment_intent.succeeded')
    expect(sim2.status).toBe(200)

    // Payment status should still be SUCCEEDED (no double-processing)
    const payRes = await paymentGet(request, `/status/${co.orderId}`)
    expect(payRes.data.status).toBe('SUCCEEDED')
  })

  // ── 5. Failed payment ───────────────────────────────────────────────────
  test('5. Webhook simulate — payment_intent.payment_failed → payment FAILED, order stays PENDING', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-05')

    const simRes = await simulateWebhook(co.orderId, 'payment_intent.payment_failed', { reason: 'Card declined' })
    expect(simRes.status).toBe(200)
    expect(simRes.data.status).toBe('FAILED')

    // Payment should be FAILED
    const payRes = await paymentGet(request, `/status/${co.orderId}`)
    expect(payRes.data.status).toBe('FAILED')

    // Wait for event propagation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Order should remain PENDING (not confirmed)
    const orderRes = await orderGet(request, `/my/${co.orderId}`)
    expect(orderRes.status).toBe(200)
    expect(orderRes.data.status).toBe('PENDING')
  })

  // ── 6. Refund (admin) — full refund after SUCCEEDED ──────────────────────
  test('6. Admin refund — full refund after payment.succeeded → REFUNDED', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-06')

    // Simulate payment success first
    await simulateWebhook(co.orderId, 'payment_intent.succeeded')

    // Admin creates refund
    const adminCtx = await setupAdminContext()
    try {
      const res = await paymentPost(adminCtx, '/admin/refund', { orderId: co.orderId, reason: 'Customer complaint' })
      expect(res.status).toBe(200)
      expect(res.data.status).toBe('REFUNDED')
      expect(res.data.refundId).toBeTruthy()
    } finally {
      try { await (adminCtx as any).dispose?.() } catch { /* noop */ }
    }

    // Verify payment is now REFUNDED
    const payRes = await paymentGet(request, `/status/${co.orderId}`)
    expect(payRes.data.status).toBe('REFUNDED')
  })

  // ── 7. Partial refund ───────────────────────────────────────────────────
  test('7. Partial refund — charge.refunded.partial → PARTIALLY_REFUNDED', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-07')

    // Simulate payment success
    await simulateWebhook(co.orderId, 'payment_intent.succeeded')

    // Simulate partial refund webhook
    const partialAmount = 500 // $5.00 of $15.00
    const simRes = await simulateWebhook(co.orderId, 'charge.refunded.partial', { amountCents: partialAmount })
    expect(simRes.status).toBe(200)
    expect(simRes.data.status).toBe('PARTIALLY_REFUNDED')

    // Verify payment
    const payRes = await paymentGet(request, `/${co.paymentId}`)
    expect(payRes.data.status).toBe('PARTIALLY_REFUNDED')
    expect(payRes.data.refundedAmountCents).toBe(partialAmount)
  })

  // ── 8. Payment/order consistency — order confirms after payment succeeds ─
  test('8. Payment→Order consistency — order auto-confirms after payment.succeeded', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-08')

    // Before payment: order is PENDING
    const beforeRes = await orderGet(request, `/my/${co.orderId}`)
    expect(beforeRes.data.status).toBe('PENDING')

    // Simulate payment success
    await simulateWebhook(co.orderId, 'payment_intent.succeeded')

    // Wait for event propagation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // After payment: order should be CONFIRMED
    const afterRes = await orderGet(request, `/my/${co.orderId}`)
    expect(afterRes.data.status).toBe('CONFIRMED')
  })

  // ── 9. Non-owner cannot view payment → 403 ──────────────────────────────
  test('9. Non-owner cannot view payment → 403', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-09')

    // Create a second customer
    const { request: pw } = await import('@playwright/test')
    const ctx2 = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await signupViaGateway(ctx2, uniqueEmail('pmt2'))
      const res = await paymentGet(ctx2, `/${co.paymentId}`)
      expect(res.status).toBe(403)
    } finally {
      await ctx2.dispose()
    }
  })

  // ── 10. Non-admin cannot create refund → 403 ────────────────────────────
  test('10. Non-admin cannot create refund → 403', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-10')
    const res = await paymentPost(request, '/admin/refund', { orderId: co.orderId })
    expect(res.status).toBe(403)
  })

  // ── 11. Unauthenticated getPayment → 401 ────────────────────────────────
  test('11. Unauthenticated getPayment → 401', async () => {
    const { request: pw } = await import('@playwright/test')
    const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      const res = await ctx.get('/api/v1/payments/some-id')
      expect(res.status()).toBe(401)
    } finally { await ctx.dispose() }
  })

  // ── 12. Admin can view any payment ──────────────────────────────────────
  test('12. Admin can view any customer payment', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-11')
    const adminCtx = await setupAdminContext()
    try {
      const res = await paymentGet(adminCtx, `/${co.paymentId}`)
      expect(res.status).toBe(200)
      expect(res.data.customerId).toBe(customer.userId)
    } finally {
      try { await (adminCtx as any).dispose?.() } catch { /* noop */ }
    }
  })

  // ── 13. Refund on non-SUCCEEDED payment → 400 ───────────────────────────
  test('13. Refund on PENDING payment → 400', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-12')
    // Don't simulate payment success — payment stays PENDING
    const adminCtx = await setupAdminContext()
    try {
      const res = await paymentPost(adminCtx, '/admin/refund', { orderId: co.orderId })
      expect(res.status).toBe(400)
    } finally {
      try { await (adminCtx as any).dispose?.() } catch { /* noop */ }
    }
  })

  // ── 14. Get payment for non-existent order → 404 ────────────────────────
  test('14. getPaymentStatus for non-existent order → 404', async ({ request }) => {
    const res = await paymentGet(request, '/status/nonexistent-order-id-99999')
    expect(res.status).toBe(404)
  })

  // ── 15. Refund for non-existent order → 404 ─────────────────────────────
  test('15. Refund for non-existent order → 404', async () => {
    const adminCtx = await setupAdminContext()
    try {
      const res = await paymentPost(adminCtx, '/admin/refund', { orderId: 'nonexistent-order-id-99999' })
      expect(res.status).toBe(404)
    } finally {
      try { await (adminCtx as any).dispose?.() } catch { /* noop */ }
    }
  })
})
