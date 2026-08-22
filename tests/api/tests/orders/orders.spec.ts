import { test, expect } from '@playwright/test'
import {
  setupCustomer,
  setupChefWithDish,
  checkout,
  orderPost,
  orderGet,
  orderPatch,
  signinCustomer,
  type ChefFixture,
  type CustomerSession,
} from '../../helpers/order'
import { chefPost } from '../../helpers/chef'

// ── Shared fixtures ───────────────────────────────────────────────────────
// Chef uses a separate Playwright context (created once in beforeAll).
// Customer is created once in beforeAll but must re-signin per test because
// Playwright gives each test a fresh `request` fixture (cookies don't carry over).
let chef: ChefFixture
let customer: CustomerSession

test.beforeAll(async ({ request }) => {
  chef = await setupChefWithDish()
  customer = await setupCustomer(request, 'ord')
})

test.afterAll(async () => {
  if (chef?.request) {
    try { await (chef.request as any).dispose?.() } catch { /* noop */ }
  }
})

// Re-signin before each test — Playwright gives each test a fresh request fixture
test.beforeEach(async ({ request }) => {
  await signinCustomer(request, customer.email, customer.password)
})

test.describe('Phase 5 — Order Service (via Gateway)', () => {

  test('1. Checkout — 201, returns order + paymentId + clientSecret', async ({ request }) => {
    const res = await orderPost(request, '/checkout', {
      chefId: chef.chefId,
      deliveryDate: '2026-12-01',
      addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 2 }],
      customerNote: 'Extra spicy please',
    })
    expect(res.status).toBe(201)
    expect(res.data.order).toBeDefined()
    expect(res.data.order.status).toBe('PENDING')
    expect(res.data.order.pricing.subtotal).toBe(30.00)
    expect(res.data.paymentId).toBeTruthy()
    expect(res.data.clientSecret).toBeTruthy()
  })

  test('2. Checkout preview — 200, returns pricing breakdown', async ({ request }) => {
    const res = await orderPost(request, '/checkout/preview', {
      chefId: chef.chefId,
      deliveryDate: '2026-12-02',
      addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 3 }],
    })
    expect(res.status).toBe(200)
    expect(res.data.subtotal).toBe(45.00)
    expect(res.data.total).toBe(45.00)
    expect(res.data.currency).toBe('USD')
  })

  test('3. Get my order — 200', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-03')
    const res = await orderGet(request, `/my/${co.orderId}`)
    expect(res.status).toBe(200)
    expect(res.data._id).toBe(co.orderId)
    expect(res.data.status).toBe('PENDING')
  })

  test('4. List my orders — 200, returns array', async ({ request }) => {
    await checkout(request, chef, customer, '2026-12-04')
    const res = await orderGet(request, '/my')
    expect(res.status).toBe(200)
    expect(res.data.orders).toBeDefined()
    expect(Array.isArray(res.data.orders)).toBe(true)
    expect(res.data.orders.length).toBeGreaterThan(0)
  })

  test('5. Status transitions — full lifecycle', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-05')
    const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
    for (const newStatus of statuses) {
      const res = await orderPatch(chef.request, `/${co.orderId}/status`, { newStatus })
      expect(res.status).toBe(200)
      expect(res.data.status).toBe(newStatus)
    }
  })

  test('6. Invalid status transition — DELIVERED → CONFIRMED → 400', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-06')
    for (const s of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
      await orderPatch(chef.request, `/${co.orderId}/status`, { newStatus: s })
    }
    const res = await orderPatch(chef.request, `/${co.orderId}/status`, { newStatus: 'CONFIRMED' })
    expect(res.status).toBe(400)
  })

  test('7. Cancel order — customer cancels PENDING → 200', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-07')
    const res = await orderPost(request, `/${co.orderId}/cancel`, {
      reason: 'CUSTOMER_REQUEST',
      note: 'Changed my mind',
    })
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('CANCELLED')
    expect(res.data.cancellation.cancelledBy).toBe('CUSTOMER')
  })

  test('8. Cancel order in DELIVERED state → 400', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-08')
    for (const s of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
      await orderPatch(chef.request, `/${co.orderId}/status`, { newStatus: s })
    }
    const res = await orderPost(request, `/${co.orderId}/cancel`, { reason: 'CUSTOMER_REQUEST' })
    expect(res.status).toBe(400)
  })

  test('9. Invalid dish — non-existent dishId → 400/404', async ({ request }) => {
    const res = await orderPost(request, '/checkout', {
      chefId: chef.chefId,
      deliveryDate: '2026-12-09',
      addressId: customer.addressId,
      items: [{ dishId: 'nonexistent-dish-id-12345', quantity: 1 }],
    })
    expect([400, 404]).toContain(res.status)
  })

  test('10. Inactive dish — DRAFT dish → 400', async ({ request }) => {
    const dishRes = await chefPost(chef.request, '/me/dishes', {
      name: 'Draft Dish', description: 'Not activated', price: 10.00,
      currency: 'USD', cuisine: 'PAKISTANI', dietaryTags: [], allergens: [],
      preparationTimeMinutes: 30, minimumOrderQuantity: 1, maximumOrderQuantity: 5,
    })
    const draftDishId = dishRes.data._id ?? dishRes.data.id
    const res = await orderPost(request, '/checkout', {
      chefId: chef.chefId, deliveryDate: '2026-12-10', addressId: customer.addressId,
      items: [{ dishId: draftDishId, quantity: 1 }],
    })
    expect(res.status).toBe(400)
  })

  test('11. Wrong chef — dish from chef A with chef B → 400/404', async ({ request }) => {
    const chef2 = await setupChefWithDish()
    try {
      const res = await orderPost(request, '/checkout', {
        chefId: chef.chefId, deliveryDate: '2026-12-11', addressId: customer.addressId,
        items: [{ dishId: chef2.dishId, quantity: 1 }],
      })
      expect([400, 404]).toContain(res.status)
    } finally {
      try { await (chef2.request as any).dispose?.() } catch { /* noop */ }
    }
  })

  test('12. Invalid address — non-existent addressId → 404', async ({ request }) => {
    const res = await orderPost(request, '/checkout', {
      chefId: chef.chefId, deliveryDate: '2026-12-12', addressId: 'nonexistent-addr-67890',
      items: [{ dishId: chef.dishId, quantity: 1 }],
    })
    expect([400, 404]).toContain(res.status)
  })

  test('13. Unauthenticated checkout → 401', async () => {
    const { request: pw } = await import('@playwright/test')
    const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      const res = await ctx.post('/api/v1/orders/checkout', {
        data: { chefId: chef.chefId, deliveryDate: '2026-12-13', addressId: 'x', items: [{ dishId: chef.dishId, quantity: 1 }] },
      })
      expect(res.status()).toBe(401)
    } finally { await ctx.dispose() }
  })

  test('14. Capacity enforcement — third order on same date → 400', async ({ request }) => {
    const capDate = '2026-12-25'
    const r1 = await orderPost(request, '/checkout', { chefId: chef.chefId, deliveryDate: capDate, addressId: customer.addressId, items: [{ dishId: chef.dishId, quantity: 1 }] })
    expect(r1.status).toBe(201)
    const r2 = await orderPost(request, '/checkout', { chefId: chef.chefId, deliveryDate: capDate, addressId: customer.addressId, items: [{ dishId: chef.dishId, quantity: 1 }] })
    expect(r2.status).toBe(201)
    const r3 = await orderPost(request, '/checkout', { chefId: chef.chefId, deliveryDate: capDate, addressId: customer.addressId, items: [{ dishId: chef.dishId, quantity: 1 }] })
    expect(r3.status).toBe(400)
  })

  test('15. Chef ownership — chef B cannot update chef A order → 403', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-14')
    const chef2 = await setupChefWithDish()
    try {
      const res = await orderPatch(chef2.request, `/${co.orderId}/status`, { newStatus: 'CONFIRMED' })
      expect(res.status).toBe(403)
    } finally { try { await (chef2.request as any).dispose?.() } catch { /* noop */ } }
  })

  test('16. Customer cannot update order status → 403', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-16')
    const res = await orderPatch(request, `/${co.orderId}/status`, { newStatus: 'CONFIRMED' })
    expect(res.status).toBe(403)
  })

  test('17. Get non-existent order → 404', async ({ request }) => {
    // Use a valid 24-char hex ObjectId that doesn't exist in the DB
    const res = await orderGet(request, '/my/507f1f77bcf86cd799439011')
    expect(res.status).toBe(404)
  })

  test('18. Cancel non-existent order → 404', async ({ request }) => {
    const res = await orderPost(request, '/507f1f77bcf86cd799439011/cancel', { reason: 'CUSTOMER_REQUEST' })
    expect(res.status).toBe(404)
  })

  test('19. Invalid status enum → 400', async ({ request }) => {
    const co = await checkout(request, chef, customer, '2026-12-17')
    const res = await orderPatch(chef.request, `/${co.orderId}/status`, { newStatus: 'INVALID_STATUS' })
    expect(res.status).toBe(400)
  })

  test('20. Idempotency — duplicate checkout returns same order', async ({ request }) => {
    const idemKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const r1 = await orderPost(request, '/checkout', {
      chefId: chef.chefId, deliveryDate: '2026-12-18', addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 1 }], idempotencyKey: idemKey,
    })
    expect(r1.status).toBe(201)
    const orderId1 = r1.data.order._id
    const r2 = await orderPost(request, '/checkout', {
      chefId: chef.chefId, deliveryDate: '2026-12-18', addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 1 }], idempotencyKey: idemKey,
    })
    expect([200, 201]).toContain(r2.status)
    expect(r2.data.order._id).toBe(orderId1)
  })
})
