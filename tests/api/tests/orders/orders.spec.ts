import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL  = process.env['AUTH_SERVICE_URL']  ?? 'http://127.0.0.1:3001'
const USER_SERVICE_URL  = process.env['USER_SERVICE_URL']  ?? 'http://127.0.0.1:3002'
const CHEF_SERVICE_URL  = process.env['CHEF_SERVICE_URL']  ?? 'http://127.0.0.1:3003'
const ORDER_SERVICE_URL = process.env['ORDER_SERVICE_URL'] ?? 'http://127.0.0.1:3004'

function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

async function createCustomer(request: any) {
  const email = uniqueEmail('cust')
  const password = 'CustPassword123!'

  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId

  const headers = {
    'x-user-id': userId,
    'x-user-role': 'USER',
    'x-user-email': email,
  }

  // Ensure user profile & address exist
  await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
    headers,
    data: { firstName: 'Ali', lastName: 'Customer', phone: '+923001112233' },
  })

  const addrRes = await request.post(`${USER_SERVICE_URL}/trpc/createAddress`, {
    headers,
    data: {
      label: 'HOME',
      addressLine: 'House 42, Street 9, F-7/1',
      city: 'Islamabad',
      isDefault: true,
    },
  })
  expect(addrRes.status()).toBe(200)
  const addrJson = await addrRes.json()
  const addressId = addrJson.result?.data?._id ?? addrJson.data?._id ?? addrJson._id

  return { userId, email, headers, addressId }
}

async function createActiveChefWithDish(request: any) {
  const email = uniqueEmail('chef')
  const password = 'ChefPassword123!'

  // 1. Signup user
  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId

  const userHeaders = {
    'x-user-id': userId,
    'x-user-role': 'USER',
    'x-user-email': email,
  }

  // 2. Submit chef application draft
  const appRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
    headers: userHeaders,
    data: {
      displayName: 'Chef Master Khan',
      bio: 'Professional master chef specializing in Pakistani cuisine',
      cuisineSpecialties: ['PAKISTANI', 'BBQ', 'KARAHI'],
    },
  })
  expect(appRes.status()).toBe(200)
  const chefProfile = (await appRes.json()).result.data
  const chefId = chefProfile._id ?? chefProfile.id

  // 3. Admin approves chef (promotes to CHEF & ACTIVE)
  const adminHeaders = {
    'x-user-id': 'admin-01',
    'x-user-role': 'ADMIN',
    'x-user-email': 'admin@chefmate.test',
  }
  const approveRes = await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
    headers: adminHeaders,
    data: {
      chefId,
      verificationStatus: 'ACTIVE',
      accountState: 'ACTIVE',
    },
  })
  expect(approveRes.status()).toBe(200)

  // 4. Role is now CHEF
  const chefHeaders = {
    'x-user-id': userId,
    'x-user-role': 'CHEF',
    'x-user-email': email,
  }

  // 5. Create operating schedule for all 7 days with valid ScheduleWeekDay enum
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

  // Set Capacity
  await request.patch(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule/capacity`, {
    headers: chefHeaders,
    data: {
      maxOrdersPerDay: 50,
      prepTimeMinutes: 45,
      leadTimeHours: 1,
    },
  })

  // 6. Create & activate dish
  const createDishRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
    headers: chefHeaders,
    data: {
      name: 'Special Chicken Biryani',
      description: 'Authentic aromatic basmati rice cooked with seasoned chicken and herbs',
      price: 15.00,
      currency: 'USD',
      portionInfo: '1 person',
      cuisine: 'PAKISTANI',
      dietaryTags: ['HALAL'],
      allergens: [],
      preparationTimeMinutes: 45,
      minimumOrderQuantity: 1,
      maximumOrderQuantity: 10,
    },
  })
  expect([200, 201]).toContain(createDishRes.status())
  const dishJson = await createDishRes.json()
  const dishId = dishJson._id ?? dishJson.id ?? dishJson.data?._id ?? dishJson.data?.id

  // Activate dish
  const activateDishRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/activate`, {
    headers: chefHeaders,
    data: {},
  })
  expect(activateDishRes.status()).toBe(200)

  return { userId, email, chefId, chefHeaders, dishId }
}

test.describe('Phase A: Order Service Tests (/trpc/*)', () => {

  test('A-1: Unauthenticated request to /trpc/createOrder returns 401', async ({ request }) => {
    const res = await request.post(`${ORDER_SERVICE_URL}/trpc/createOrder`, {
      data: {
        chefId: 'some-chef',
        deliveryDate: '2026-10-01',
        addressId: 'some-address',
        items: [{ dishId: 'dish-1', quantity: 1 }],
      },
    })
    expect(res.status()).toBe(401)
  })

  test('A-2: listMyOrders returns empty array for fresh customer', async ({ request }) => {
    const customer = await createCustomer(request)
    const res = await request.get(`${ORDER_SERVICE_URL}/trpc/listMyOrders`, {
      headers: customer.headers,
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()).result.data
    expect(body.orders).toBeDefined()
    expect(body.orders.length).toBe(0)
  })

  test('A-3 to A-5: Complete Checkout, Get My Order, and Chef Status Lifecycle', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithDish(request)

    const deliveryDate = '2026-10-15'

    // Step 1: Checkout (Create order + payment intent)
    const checkoutRes = await request.post(`${ORDER_SERVICE_URL}/trpc/checkout`, {
      headers: customer.headers,
      data: {
        chefId: chef.chefId,
        deliveryDate,
        addressId: customer.addressId,
        items: [{ dishId: chef.dishId, quantity: 2 }],
        customerNote: 'Please make it extra spicy',
      },
    })
    if (checkoutRes.status() !== 200) {
      console.log('CHECKOUT FAILED:', checkoutRes.status(), await checkoutRes.text())
    }
    expect(checkoutRes.status()).toBe(200)
    const checkoutData = (await checkoutRes.json()).result.data
    expect(checkoutData.order).toBeDefined()
    const orderId = checkoutData.order._id
    expect(checkoutData.order.status).toBe('PENDING')
    expect(checkoutData.order.pricing.subtotal).toBe(30.00) // 2 * $15.00
    expect(checkoutData.order.customerId).toBe(customer.userId)

    // Step 2: Get My Order (tRPC query with encoded input)
    const inputParam = encodeURIComponent(JSON.stringify({ orderId }))
    const getOrderRes = await request.get(`${ORDER_SERVICE_URL}/trpc/getMyOrder?input=${inputParam}`, {
      headers: customer.headers,
    })
    expect(getOrderRes.status()).toBe(200)
    const orderData = (await getOrderRes.json()).result.data
    expect(orderData._id).toBe(orderId)
    expect(orderData.status).toBe('PENDING')

    // Step 3: Chef Advances Order Status (PENDING -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED)
    const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
    for (const newStatus of statuses) {
      const updateRes = await request.post(`${ORDER_SERVICE_URL}/trpc/updateOrderStatus`, {
        headers: chef.chefHeaders,
        data: { orderId, newStatus },
      })
      expect(updateRes.status()).toBe(200)
      const updatedOrder = (await updateRes.json()).result.data
      expect(updatedOrder.status).toBe(newStatus)
    }
  })

  test('A-6: Customer cancels an order in PENDING status', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithDish(request)

    const deliveryDate = '2026-10-20'

    // Create Order
    const checkoutRes = await request.post(`${ORDER_SERVICE_URL}/trpc/checkout`, {
      headers: customer.headers,
      data: {
        chefId: chef.chefId,
        deliveryDate,
        addressId: customer.addressId,
        items: [{ dishId: chef.dishId, quantity: 1 }],
      },
    })
    expect(checkoutRes.status()).toBe(200)
    const orderId = (await checkoutRes.json()).result.data.order._id

    // Cancel Order
    const cancelRes = await request.post(`${ORDER_SERVICE_URL}/trpc/cancelOrder`, {
      headers: customer.headers,
      data: {
        orderId,
        reason: 'CUSTOMER_REQUEST',
        note: 'Plans changed',
      },
    })
    expect(cancelRes.status()).toBe(200)
    const cancelledOrder = (await cancelRes.json()).result.data
    expect(cancelledOrder.status).toBe('CANCELLED')
    expect(cancelledOrder.cancellation.cancelledBy).toBe('CUSTOMER')
  })

  test('A-7: Coupon Lifecycle (Admin Create -> User Validate -> Apply in Checkout)', async ({ request }) => {
    const adminHeaders = {
      'x-user-id': 'admin-01',
      'x-user-role': 'ADMIN',
      'x-user-email': 'admin@chefmate.test',
    }

    const customer = await createCustomer(request)
    const chef = await createActiveChefWithDish(request)

    const couponCode = `SAVE10_${Date.now()}`

    // 1. Admin creates a 10% percentage discount coupon
    const createCouponRes = await request.post(`${ORDER_SERVICE_URL}/trpc/createCoupon`, {
      headers: adminHeaders,
      data: {
        code: couponCode,
        discountType: 'PERCENTAGE',
        discountValue: 10, // 10%
        minOrderAmount: 10,
        maxDiscountAmount: 50,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        usageLimit: 100,
        perCustomerLimit: 1,
      },
    })
    expect(createCouponRes.status()).toBe(200)

    // 2. Customer validates coupon (tRPC Query -> GET with encoded input)
    const validateParam = encodeURIComponent(JSON.stringify({
      couponCode,
      subtotal: 30.00,
      chefId: chef.chefId,
    }))
    const validateRes = await request.get(`${ORDER_SERVICE_URL}/trpc/validateCoupon?input=${validateParam}`, {
      headers: customer.headers,
    })
    expect(validateRes.status()).toBe(200)
    const validData = (await validateRes.json()).result.data
    expect(validData.discountAmount).toBe(3.00) // 10% of 30.00 = 3.00

    // 3. Customer uses coupon in checkout
    const checkoutRes = await request.post(`${ORDER_SERVICE_URL}/trpc/checkout`, {
      headers: customer.headers,
      data: {
        chefId: chef.chefId,
        deliveryDate: '2026-10-25',
        addressId: customer.addressId,
        items: [{ dishId: chef.dishId, quantity: 2 }], // subtotal = 30.00
        couponCode,
      },
    })
    expect(checkoutRes.status()).toBe(200)
    const checkoutData = (await checkoutRes.json()).result.data
    expect(checkoutData.order.pricing.subtotal).toBe(30.00)
    expect(checkoutData.order.pricing.discountAmount).toBe(3.00)
    expect(checkoutData.order.pricing.total).toBe(27.00)
    expect(checkoutData.order.pricing.couponCode).toBe(couponCode)
  })
})
