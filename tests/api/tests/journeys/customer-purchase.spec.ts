import { test, expect } from '@playwright/test'
import {
  setupChefWithDish,
  setupCustomer,
  checkout,
  orderGet,
  orderPatch,
  signinCustomer,
  type ChefFixture,
  type CustomerSession,
} from '../../helpers/order'
import { reviewPost } from '../../helpers/review'
import { confirmPayment } from '../../helpers/subscription'

test.describe('Journey 2 -- customer purchase through the gateway', () => {
  test.setTimeout(180_000)

  let chef: ChefFixture
  let customer: CustomerSession

  test.beforeAll(async ({ request }) => {
    chef = await setupChefWithDish()
    customer = await setupCustomer(request, 'journey-purchase')
  }, { timeout: 120_000 })

  test.afterAll(async () => {
    await chef?.request?.dispose()
  })

  test('signup to delivered order and eligible review', async ({ request }) => {
    await signinCustomer(request, customer.email, customer.password)

    const profile = await request.get('/api/v1/chefs/' + chef.chefId)
    expect(profile.status()).toBe(200)

    const dishes = await request.get(`/api/v1/chefs/${chef.chefId}/dishes`, {
      params: { status: 'ACTIVE' },
    })
    expect(dishes.status()).toBe(200)
    const dishesBody = await dishes.json()
    const listedDishes = dishesBody.dishes ?? dishesBody.items ?? dishesBody
    expect(JSON.stringify(listedDishes)).toContain(chef.dishId)

    const checkoutResult = await checkout(
      request,
      chef,
      customer,
      '2026-12-15',
      1,
    )
    expect(checkoutResult.orderId).toBeTruthy()
    expect(checkoutResult.paymentId).toBeTruthy()
    expect(checkoutResult.clientSecret).toBeTruthy()

    // This calls Stripe's test API and lets the configured ngrok webhook publish
    // the real payment event; it does not use the webhook simulation endpoint.
    const confirmation = await confirmPayment(checkoutResult.orderId)
    expect(confirmation.status).toBe(200)

    await expect.poll(async () => {
      const order = await orderGet(request, `/my/${checkoutResult.orderId}`)
      return order.data?.status
    }, { timeout: 30_000 }).toBe('CONFIRMED')

    for (const status of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
      const transition = await orderPatch(
        chef.request,
        `/${checkoutResult.orderId}/status`,
        { newStatus: status },
      )
      expect(transition.status, `transition to ${status}`).toBe(200)
    }

    await expect.poll(async () => {
      const order = await orderGet(request, `/my/${checkoutResult.orderId}`)
      return order.data?.status
    }, { timeout: 15_000 }).toBe('DELIVERED')

    let review: Awaited<ReturnType<typeof reviewPost>>
    await expect.poll(async () => {
      review = await reviewPost(request, '', {
        orderId: checkoutResult.orderId,
        chefId: chef.chefId,
        rating: 5,
        text: 'Complete journey review',
      })
      return review.status
    }, { timeout: 30_000, intervals: [500, 1_000, 2_000] }).toBe(201)
    expect(review!.data.verifiedPurchase).toBe(true)
  })
})
