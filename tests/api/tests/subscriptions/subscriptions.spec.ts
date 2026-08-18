import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL         = process.env['AUTH_SERVICE_URL']         ?? 'http://127.0.0.1:3001'
const USER_SERVICE_URL         = process.env['USER_SERVICE_URL']         ?? 'http://127.0.0.1:3002'
const CHEF_SERVICE_URL         = process.env['CHEF_SERVICE_URL']         ?? 'http://127.0.0.1:3003'
const ORDER_SERVICE_URL        = process.env['ORDER_SERVICE_URL']        ?? 'http://127.0.0.1:3004'
const SUBSCRIPTION_SERVICE_URL = process.env['SUBSCRIPTION_SERVICE_URL'] ?? 'http://127.0.0.1:3009'

function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

async function createCustomer(request: any) {
  const email = uniqueEmail('subcust')
  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password: 'CustPass123!' },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId
  const headers = { 'x-user-id': userId, 'x-user-role': 'USER', 'x-user-email': email }

  await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
    headers,
    data: { firstName: 'Sub', lastName: 'Customer', phone: '+923005554433' },
  })
  const addrRes = await request.post(`${USER_SERVICE_URL}/trpc/createAddress`, {
    headers,
    data: { label: 'HOME', addressLine: '12 Subscription Ave, Sector F-6', city: 'Islamabad', isDefault: true },
  })
  expect(addrRes.status()).toBe(200)
  const addrJson = await addrRes.json()
  const addressId = addrJson.result?.data?._id ?? addrJson.data?._id ?? addrJson._id
  return { userId, email, headers, addressId }
}

async function createActiveChefWithPlan(request: any) {
  const email = uniqueEmail('subchef')
  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password: 'ChefPass123!' },
  })
  expect(signupRes.status()).toBe(200)
  const userId = (await signupRes.json()).result.data.userId
  const userHeaders = { 'x-user-id': userId, 'x-user-role': 'USER', 'x-user-email': email }

  // 1. Chef profile
  const appRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
    headers: userHeaders,
    data: {
      displayName: 'Chef Meal Planner',
      bio: 'Gourmet meal prep specialist with recurring subscriptions',
      cuisineSpecialties: ['PAKISTANI', 'CONTINENTAL'],
    },
  })
  expect(appRes.status()).toBe(200)
  const chefId = (await appRes.json()).result.data._id

  // 2. Admin approval
  const adminHeaders = { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' }
  const approveRes = await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
    headers: adminHeaders,
    data: { chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
  })
  expect(approveRes.status()).toBe(200)

  const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

  // 3. Operating Schedule
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
  await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
    headers: chefHeaders,
    data: {
      recurringDays: allDays.map((dayOfWeek) => ({
        dayOfWeek,
        windows: [{ openTime: '08:00', closeTime: '23:00' }],
        isActive: true,
      })),
    },
  })
  await request.patch(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule/capacity`, {
    headers: chefHeaders,
    data: { maxOrdersPerDay: 50, prepTimeMinutes: 30, leadTimeHours: 1 },
  })

  // 4. Create Dish 1
  const dish1Res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
    headers: chefHeaders,
    data: {
      name: 'Diet Grilled Chicken Box',
      description: 'Healthy grilled chicken breast with roasted veggies',
      price: 18.00,
      currency: 'USD',
      portionInfo: '1 person',
      cuisine: 'CONTINENTAL',
      dietaryTags: ['HALAL', 'HIGH_PROTEIN'],
      allergens: [],
      preparationTimeMinutes: 30,
      minimumOrderQuantity: 1,
      maximumOrderQuantity: 10,
    },
  })
  expect([200, 201]).toContain(dish1Res.status())
  const dish1Json = await dish1Res.json()
  const dish1Id = dish1Json.data?.id ?? dish1Json._id ?? dish1Json.id ?? dish1Json.data?._id

  await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dish1Id}/activate`, {
    headers: chefHeaders,
    data: {},
  })

  // 5. Create Dish 2 (for swap testing)
  const dish2Res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
    headers: chefHeaders,
    data: {
      name: 'Herb Salmon & Brown Rice',
      description: 'Pan-seared salmon with steamed broccoli and brown rice',
      price: 22.00,
      currency: 'USD',
      portionInfo: '1 person',
      cuisine: 'CONTINENTAL',
      dietaryTags: ['HALAL', 'HIGH_PROTEIN'],
      allergens: ['FISH'],
      preparationTimeMinutes: 35,
      minimumOrderQuantity: 1,
      maximumOrderQuantity: 10,
    },
  })
  expect([200, 201]).toContain(dish2Res.status())
  const dish2Json = await dish2Res.json()
  const dish2Id = dish2Json.data?.id ?? dish2Json._id ?? dish2Json.id ?? dish2Json.data?._id

  await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dish2Id}/activate`, {
    headers: chefHeaders,
    data: {},
  })

  // 6. Create Meal Plan (SUBSCRIPTION type with WEEKLY frequency)
  const planRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans`, {
    headers: chefHeaders,
    data: {
      name: 'Weekly Healthy Box Plan',
      description: 'Weekly delivery of fresh balanced meals',
      type: 'SUBSCRIPTION',
      frequency: 'WEEKLY',
      currency: 'USD',
      basePrice: 50.00,
      pauseRules: { allowPause: true, maxPauseDays: 30 },
      skipRules: { allowSkip: true, minNoticeHours: 1 },
      swapRules: { allowSwap: true, swapWindowHours: 1 },
    },
  })
  expect([200, 201]).toContain(planRes.status())
  const planJson = await planRes.json()
  const planId = planJson.data?._id ?? planJson._id ?? planJson.id

  // 7. Add Tier to Plan (including dish1 and dish2)
  const tierRes = await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/tiers`, {
    headers: chefHeaders,
    data: {
      tiers: [
        {
          name: 'Standard Healthy Tier',
          description: 'Standard selection of healthy protein meals',
          dishIds: [dish1Id, dish2Id],
          priceOverride: 50.00,
          portionsPerDish: 1,
        },
      ],
    },
  })
  expect(tierRes.status()).toBe(200)
  const tierData = (await tierRes.json()).data ?? (await tierRes.json())
  const tierId = tierData.tiers?.[0]?._id ?? tierData.tiers?.[0]?.id

  // 8. Activate Meal Plan
  const activatePlanRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/activate`, {
    headers: chefHeaders,
    data: {},
  })
  expect(activatePlanRes.status()).toBe(200)

  return { userId, email, chefId, chefHeaders, planId, tierId, dish1Id, dish2Id }
}

test.describe('Phase C: Subscription Service Tests (/trpc/*)', () => {

  test('C-1: Unauthenticated request to /trpc/createSubscription returns 401', async ({ request }) => {
    const res = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      data: {
        planId: 'plan-123',
        chefId: 'chef-123',
        addressId: 'addr-123',
        frequency: 'WEEKLY',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('C-2: listMySubscriptions returns empty array for fresh customer', async ({ request }) => {
    const customer = await createCustomer(request)
    const res = await request.get(`${SUBSCRIPTION_SERVICE_URL}/trpc/listMySubscriptions`, {
      headers: customer.headers,
    })
    expect(res.status()).toBe(200)
    const data = (await res.json()).result.data
    expect(data.subscriptions).toBeDefined()
    expect(data.subscriptions.length).toBe(0)
    expect(data.total).toBe(0)
  })

  test('C-3 & C-4: Create Subscription, verify ACTIVE state and retrieve by ID', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    // Create Subscription
    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        tierId: chef.tierId,
        addressId: customer.addressId,
        frequency: 'WEEKLY',
        customerNote: 'Deliver in the morning',
      },
    })
    if (createRes.status() !== 200) {
      console.log('CREATE SUBSCRIPTION FAILED:', createRes.status(), await createRes.text())
    }
    expect(createRes.status()).toBe(200)
    const createData = (await createRes.json()).result.data
    expect(createData.subscription).toBeDefined()
    const subscriptionId = createData.subscription._id
    expect(createData.subscription.status).toBe('ACTIVE')
    expect(createData.subscription.frequency).toBe('WEEKLY')
    expect(createData.subscription.customerId).toBe(customer.userId)
    expect(createData.subscription.priceSnapshot.amountCents).toBe(5000) // $50.00

    // Get Subscription by ID
    const inputParam = encodeURIComponent(JSON.stringify({ subscriptionId }))
    const getRes = await request.get(`${SUBSCRIPTION_SERVICE_URL}/trpc/getSubscription?input=${inputParam}`, {
      headers: customer.headers,
    })
    expect(getRes.status()).toBe(200)
    const subData = (await getRes.json()).result.data
    expect(subData._id).toBe(subscriptionId)
    expect(subData.status).toBe('ACTIVE')
    expect(subData.planId).toBe(chef.planId)
  })

  test('C-5: Cross-customer isolation — another customer cannot view subscription (403)', async ({ request }) => {
    const customer1 = await createCustomer(request)
    const customer2 = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer1.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        addressId: customer1.addressId,
        frequency: 'WEEKLY',
      },
    })
    expect(createRes.status()).toBe(200)
    const subscriptionId = (await createRes.json()).result.data.subscription._id

    // Customer2 tries to view Customer1's subscription
    const inputParam = encodeURIComponent(JSON.stringify({ subscriptionId }))
    const getRes = await request.get(`${SUBSCRIPTION_SERVICE_URL}/trpc/getSubscription?input=${inputParam}`, {
      headers: customer2.headers,
    })
    expect(getRes.status()).toBe(403)
  })

  test('C-6 & C-7: Pause and Resume Subscription lifecycle', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        addressId: customer.addressId,
        frequency: 'WEEKLY',
      },
    })
    expect(createRes.status()).toBe(200)
    const subscriptionId = (await createRes.json()).result.data.subscription._id

    // 1. Pause Subscription (ACTIVE -> PAUSED)
    const pauseRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/pauseSubscription`, {
      headers: customer.headers,
      data: { subscriptionId },
    })
    expect(pauseRes.status()).toBe(200)
    const pausedData = (await pauseRes.json()).result.data
    expect(pausedData.status).toBe('PAUSED')
    expect(pausedData.pausedAt).toBeDefined()

    // 2. Resume Subscription (PAUSED -> ACTIVE)
    const resumeRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/resumeSubscription`, {
      headers: customer.headers,
      data: { subscriptionId },
    })
    expect(resumeRes.status()).toBe(200)
    const resumedData = (await resumeRes.json()).result.data
    expect(resumedData.status).toBe('ACTIVE')
    expect(resumedData.nextBillingDate).toBeDefined()
  })

  test('C-8: Skip subscription period', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        addressId: customer.addressId,
        frequency: 'WEEKLY',
      },
    })
    expect(createRes.status()).toBe(200)
    const subscriptionId = (await createRes.json()).result.data.subscription._id

    // Skip Next Period
    const skipRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/skipSubscription`, {
      headers: customer.headers,
      data: { subscriptionId },
    })
    expect(skipRes.status()).toBe(200)
    const skippedData = (await skipRes.json()).result.data
    expect(skippedData.skippedPeriods).toBeDefined()
    expect(skippedData.skippedPeriods.length).toBeGreaterThan(0)
  })

  test('C-9: Swap subscription dish for upcoming periods', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        addressId: customer.addressId,
        frequency: 'WEEKLY',
      },
    })
    expect(createRes.status()).toBe(200)
    const sub = (await createRes.json()).result.data.subscription
    const subscriptionId = sub._id

    // Swap Dish 1 with Dish 2
    const swapRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/swapSubscriptionDish`, {
      headers: customer.headers,
      data: {
        subscriptionId,
        oldDishId: chef.dish1Id,
        newDishId: chef.dish2Id,
      },
    })
    expect(swapRes.status()).toBe(200)
    const swappedData = (await swapRes.json()).result.data
    expect(swappedData.selectedDishIds).toContain(chef.dish2Id)
  })

  test('C-10: Cancel subscription terminates recurring deliveries', async ({ request }) => {
    const customer = await createCustomer(request)
    const chef = await createActiveChefWithPlan(request)

    const createRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/createSubscription`, {
      headers: customer.headers,
      data: {
        planId: chef.planId,
        chefId: chef.chefId,
        addressId: customer.addressId,
        frequency: 'WEEKLY',
      },
    })
    expect(createRes.status()).toBe(200)
    const subscriptionId = (await createRes.json()).result.data.subscription._id

    // Cancel Subscription
    const cancelRes = await request.post(`${SUBSCRIPTION_SERVICE_URL}/trpc/cancelSubscription`, {
      headers: customer.headers,
      data: {
        subscriptionId,
        cancellationReason: 'Moving to another city',
      },
    })
    expect(cancelRes.status()).toBe(200)
    const cancelledData = (await cancelRes.json()).result.data
    expect(cancelledData.status).toBe('CANCELLED')
    expect(cancelledData.cancelledAt).toBeDefined()
    expect(cancelledData.cancellationReason).toBe('Moving to another city')
  })
})
