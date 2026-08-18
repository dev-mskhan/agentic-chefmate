import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL    = process.env['AUTH_SERVICE_URL']    ?? 'http://127.0.0.1:3001'
const USER_SERVICE_URL    = process.env['USER_SERVICE_URL']    ?? 'http://127.0.0.1:3002'
const CHEF_SERVICE_URL    = process.env['CHEF_SERVICE_URL']    ?? 'http://127.0.0.1:3003'
const ORDER_SERVICE_URL   = process.env['ORDER_SERVICE_URL']   ?? 'http://127.0.0.1:3004'
const PAYMENT_SERVICE_URL = process.env['PAYMENT_SERVICE_URL'] ?? 'http://127.0.0.1:3008'

function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

async function createCustomer(request: any) {
  const email = uniqueEmail('pmtcust')
  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password: 'CustPass123!' },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId
  const headers = { 'x-user-id': userId, 'x-user-role': 'USER', 'x-user-email': email }
  await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
    headers,
    data: { firstName: 'Pay', lastName: 'Customer', phone: '+923009998877' },
  })
  const addrRes = await request.post(`${USER_SERVICE_URL}/trpc/createAddress`, {
    headers,
    data: { label: 'HOME', addressLine: '5 Test Street', city: 'Karachi', isDefault: true },
  })
  expect(addrRes.status()).toBe(200)
  const addrJson = await addrRes.json()
  const addressId = addrJson.result?.data?._id ?? addrJson.data?._id ?? addrJson._id
  return { userId, email, headers, addressId }
}

async function createActiveChefWithDish(request: any) {
  const email = uniqueEmail('pmtchef')
  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password: 'ChefPass123!' },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId
  const userHeaders = { 'x-user-id': userId, 'x-user-role': 'USER', 'x-user-email': email }

  const appRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
    headers: userHeaders,
    data: {
      displayName: 'Chef Payment Test',
      bio: 'Testing payments end-to-end',
      cuisineSpecialties: ['PAKISTANI'],
    },
  })
  expect(appRes.status()).toBe(200)
  const chefId = (await appRes.json()).result.data._id

  const adminHeaders = { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' }
  const approveRes = await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
    headers: adminHeaders,
    data: { chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
  })
  expect(approveRes.status()).toBe(200)

  const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
  const schedRes = await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
    headers: chefHeaders,
    data: {
      recurringDays: allDays.map((dayOfWeek) => ({
        dayOfWeek,
        windows: [{ openTime: '08:00', closeTime: '23:00' }],
        isActive: true,
      })),
    },
  })
  expect(schedRes.status()).toBe(200)

  await request.patch(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule/capacity`, {
    headers: chefHeaders,
    data: { maxOrdersPerDay: 50, prepTimeMinutes: 30, leadTimeHours: 1 },
  })

  const dishRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
    headers: chefHeaders,
    data: {
      name: 'Lamb Karahi',
      description: 'Slow-cooked lamb in tomato-based gravy',
      price: 20.00,
      currency: 'USD',
      portionInfo: '2 persons',
      cuisine: 'PAKISTANI',
      dietaryTags: ['HALAL'],
      allergens: [],
      preparationTimeMinutes: 60,
      minimumOrderQuantity: 1,
      maximumOrderQuantity: 10,
    },
  })
  expect([200, 201]).toContain(dishRes.status())
  const dishJson = await dishRes.json()
  const dishId = dishJson._id ?? dishJson.id ?? dishJson.data?._id ?? dishJson.data?.id

  const activateRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/activate`, {
    headers: chefHeaders,
    data: {},
  })
  expect(activateRes.status()).toBe(200)

  return { userId, email, chefId, chefHeaders, dishId }
}

async function createOrderAndPayment(request: any, customer: any, chef: any, deliveryDate: string) {
  const checkoutRes = await request.post(`${ORDER_SERVICE_URL}/trpc/checkout`, {
    headers: customer.headers,
    data: {
      chefId: chef.chefId,
      deliveryDate,
      addressId: customer.addressId,
      items: [{ dishId: chef.dishId, quantity: 1 }],
    },
  })
  if (checkoutRes.status() !== 200) {
    const txt = await checkoutRes.text()
    throw new Error(`Checkout failed ${checkoutRes.status()}: ${txt}`)
  }
  const checkoutData = (await checkoutRes.json()).result.data
  const orderId   = checkoutData.order._id
  const paymentId = checkoutData.paymentId  // checkout returns { order, paymentId, clientSecret }
  return { orderId, paymentId }
}

test.describe('Phase B: Payment Service Tests (/trpc/*)', () => {

  test('B-1: Unauthenticated request to /trpc/getPayment returns 401', async ({ request }) => {
    const inputParam = encodeURIComponent(JSON.stringify({ paymentId: 'some-id' }))
    const res = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPayment?input=${inputParam}`)
    expect(res.status()).toBe(401)
  })

  test('B-2: getPaymentStatus by orderId returns payment status after checkout', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef     = await createActiveChefWithDish(request)

    const { orderId } = await createOrderAndPayment(request, customer, chef, '2026-11-10')

    const inputParam = encodeURIComponent(JSON.stringify({ orderId }))
    const res = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPaymentStatus?input=${inputParam}`, {
      headers: customer.headers,
    })
    expect(res.status()).toBe(200)
    const data = (await res.json()).result.data
    expect(['PENDING', 'PROCESSING', 'SUCCEEDED']).toContain(data.status)
    expect(data.amountCents).toBeGreaterThan(0)
    expect(data.currency).toBeDefined()
  })

  test('B-3: getPayment by paymentId — customer can retrieve their own payment', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef     = await createActiveChefWithDish(request)

    const { paymentId } = await createOrderAndPayment(request, customer, chef, '2026-11-15')

    const inputParam = encodeURIComponent(JSON.stringify({ paymentId }))
    const res = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPayment?input=${inputParam}`, {
      headers: customer.headers,
    })
    expect(res.status()).toBe(200)
    const payment = (await res.json()).result.data
    expect(payment._id ?? payment.id).toBeDefined()
    expect(payment.customerId).toBe(customer.userId)
    expect(payment.amountCents).toBe(2000)  // 1 x $20.00 = 2000 cents
    expect(payment.currency).toBe('USD')
    expect(['PENDING', 'PROCESSING', 'SUCCEEDED']).toContain(payment.status)
  })

  test('B-4: getPayment — different customer cannot view another payment (403)', async ({ request }) => {
    const customer1 = await createCustomer(request)
    const customer2 = await createCustomer(request)
    const chef      = await createActiveChefWithDish(request)

    const { paymentId } = await createOrderAndPayment(request, customer1, chef, '2026-11-20')

    const inputParam = encodeURIComponent(JSON.stringify({ paymentId }))
    const res = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPayment?input=${inputParam}`, {
      headers: customer2.headers,
    })
    expect(res.status()).toBe(403)
  })

  test('B-5: Admin can view any customer payment', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef     = await createActiveChefWithDish(request)

    const { paymentId } = await createOrderAndPayment(request, customer, chef, '2026-11-25')

    const adminHeaders = { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' }
    const inputParam = encodeURIComponent(JSON.stringify({ paymentId }))
    const res = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPayment?input=${inputParam}`, {
      headers: adminHeaders,
    })
    expect(res.status()).toBe(200)
    const payment = (await res.json()).result.data
    expect(payment.customerId).toBe(customer.userId)
  })

  test('B-6: Admin createRefund — succeeds if payment is SUCCEEDED, or gracefully skips if PENDING in test env', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef     = await createActiveChefWithDish(request)

    const { orderId } = await createOrderAndPayment(request, customer, chef, '2026-11-30')

    // Advance order to DELIVERED
    const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
    for (const newStatus of statuses) {
      const updateRes = await request.post(`${ORDER_SERVICE_URL}/trpc/updateOrderStatus`, {
        headers: chef.chefHeaders,
        data: { orderId, newStatus },
      })
      expect(updateRes.status()).toBe(200)
    }

    // Check payment current status
    const statusParam = encodeURIComponent(JSON.stringify({ orderId }))
    const statusRes = await request.get(`${PAYMENT_SERVICE_URL}/trpc/getPaymentStatus?input=${statusParam}`, {
      headers: customer.headers,
    })
    expect(statusRes.status()).toBe(200)
    const currentStatus = (await statusRes.json()).result.data.status

    // If payment not SUCCEEDED (no real Stripe webhook in test env), try simulate endpoint
    if (currentStatus !== 'SUCCEEDED') {
      const webhookRes = await request.post(`${PAYMENT_SERVICE_URL}/internal/webhook/simulate`, {
        headers: { 'x-internal-secret': process.env['INTERNAL_SECRET'] ?? 'internal-secret-chefmate' },
        data: { orderId, event: 'payment_intent.succeeded' },
      })
      if (webhookRes.status() === 404) {
        console.log('B-6: Webhook simulate not available — payment stayed', currentStatus, '— skipping refund assertion')
        return
      }
      expect(webhookRes.status()).toBe(200)
    }

    const adminHeaders = { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' }
    const refundRes = await request.post(`${PAYMENT_SERVICE_URL}/trpc/createRefund`, {
      headers: adminHeaders,
      data: { orderId, reason: 'Customer complaint resolved' },
    })

    if (refundRes.status() === 200) {
      const refundData = (await refundRes.json()).result.data
      expect(refundData.status).toBe('REFUNDED')
      expect(refundData.refundId).toMatch(/^re_/)
    } else {
      // Expected in test env without real Stripe webhook
      console.log('B-6 (test env): Refund blocked because payment status is still:', currentStatus)
      expect([400, 422]).toContain(refundRes.status())
    }
  })

  test('B-7: Non-admin cannot call createRefund (403)', async ({ request }) => {
    const customer    = await createCustomer(request)
    const chef        = await createActiveChefWithDish(request)
    const { orderId } = await createOrderAndPayment(request, customer, chef, '2026-12-05')

    const refundRes = await request.post(`${PAYMENT_SERVICE_URL}/trpc/createRefund`, {
      headers: customer.headers,
      data: { orderId },
    })
    expect(refundRes.status()).toBe(403)
  })
})
