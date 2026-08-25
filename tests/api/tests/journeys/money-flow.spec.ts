import { test, expect } from '@playwright/test'
import {
  setupPayoutChef,
  setupPayoutCustomer,
  signinPayoutCustomer,
  setupAdminContext,
  payoutGet,
  type PayoutChef,
  type PayoutCustomer,
} from '../../helpers/payout'

let chef: PayoutChef
let customer: PayoutCustomer
let admin: Awaited<ReturnType<typeof setupAdminContext>>

test.beforeAll(async ({ request }) => {
  chef = await setupPayoutChef()
  customer = await setupPayoutCustomer(request, 'journey4')
  admin = await setupAdminContext()
})

test.afterAll(async () => {
  await chef?.request?.dispose()
  await admin?.dispose()
})

test('Journey 4 — real payment completes an order and credits the chef ledger', async ({ request }) => {
  test.setTimeout(120_000)
  await signinPayoutCustomer(request, customer.email, customer.password)

  const checkout = await request.post('/api/v1/orders/checkout', {
    data: {
      chefId: chef.chefId,
      deliveryDate: '2026-12-25',
      addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 1 }],
    },
  })
  expect(checkout.status()).toBe(201)
  const order = await checkout.json()
  const orderId = order.order?._id ?? order._id

  const payment = await fetch(
    `${process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3008'}/internal/confirm-payment`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? 'dev-internal-secret-min-16chars!',
      },
      body: JSON.stringify({ orderId }),
    },
  )
  expect(payment.ok).toBe(true)

  await expect.poll(async () => {
    const response = await request.get(`/api/v1/orders/my/${orderId}`)
    return (await response.json().catch(() => null))?.status
  }, { timeout: 30_000 }).toBe('CONFIRMED')

  for (const status of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
    const response = await chef.request.patch(`/api/v1/orders/${orderId}/status`, { data: { newStatus: status } })
    expect(response.status()).toBe(200)
  }

  await expect.poll(async () => {
    const earnings = await payoutGet(chef.request, '/earnings')
    return (earnings.data.entries as any[]).some((entry) => entry.orderId === orderId && entry.type === 'CREDIT')
  }, { timeout: 30_000 }).toBe(true)

  const paymentStatus = await request.get(`/api/v1/payments/status/${orderId}`)
  expect(paymentStatus.status()).toBe(200)
  expect((await paymentStatus.json()).status).toBe('SUCCEEDED')

  const balanceBeforeRefund = await payoutGet(chef.request, '/balance')
  const refund = await admin.post('/api/v1/payments/admin/refund', {
    data: { orderId, reason: 'Journey 4 refund verification' },
  })
  expect(refund.status()).toBe(200)

  await expect.poll(async () => {
    const earnings = await payoutGet(chef.request, '/earnings')
    return (earnings.data.entries as any[]).some((entry) => entry.orderId === orderId && entry.type === 'DEBIT')
  }, { timeout: 30_000 }).toBe(true)

  const balanceAfterRefund = await payoutGet(chef.request, '/balance')
  expect(balanceAfterRefund.data.availableBalanceCents)
    .toBeLessThan(balanceBeforeRefund.data.availableBalanceCents)

  const refundedStatus = await request.get(`/api/v1/payments/status/${orderId}`)
  expect((await refundedStatus.json()).status).toBe('REFUNDED')
})
