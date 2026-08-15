import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'
const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

function uniqueEmail() {
  return `chef-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

async function setupActiveChef(request: any) {
  const email = uniqueEmail()
  const password = 'ChefPassword123!'

  const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
    data: { email, password },
  })
  const userId = (await signupRes.json()).result.data.userId

  const userHeaders = { 'x-user-id': userId, 'x-user-role': 'USER', 'x-user-email': email }
  const profileRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
    headers: userHeaders,
    data: { displayName: 'Chef Plan Test', cuisineSpecialties: ['PAKISTANI'] },
  })
  const chefId = (await profileRes.json()).result.data._id

  await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
    headers: { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' },
    data: { chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
  })

  return { userId, email, chefId }
}

test.describe('Group 5: Meal Plan Routes (/api/v1/chefs/me/plans)', () => {

  test('1. Unauthenticated request to create plan returns 401', async ({ request }) => {
    const res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans`, {
      data: { name: 'Test Plan', type: 'ONE_OFF' },
    })
    expect(res.status()).toBe(401)
  })

  test('2. Create ONE_OFF Meal Plan Draft (POST /api/v1/chefs/me/plans)', async ({ request }) => {
    const { userId, email } = await setupActiveChef(request)
    const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

    const res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans`, {
      headers: chefHeaders,
      data: {
        name: 'Eid Special Feast',
        description: 'Premium Eid dinner package for 6 people',
        type: 'ONE_OFF',
        basePrice: 8000,
        currency: 'PKR',
      },
    })
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    expect(body.name).toBe('Eid Special Feast')
    expect(body.type).toBe('ONE_OFF')
    expect(body.status).toBe('DRAFT')
    expect(body.basePrice).toBe(8000)
  })

  test('3. Create SUBSCRIPTION Plan & Activate/Pause/Archive lifecycle', async ({ request }) => {
    const { userId, email } = await setupActiveChef(request)
    const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

    // Step A: Create and activate a dish (plan tiers require at least one ACTIVE dish)
    const dishRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
      headers: chefHeaders,
      data: { name: 'Weekly Meal', cuisine: 'PAKISTANI', price: 800 },
    })
    expect(dishRes.status()).toBe(200)
    const dishId = (await dishRes.json())._id

    await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/activate`, {
      headers: chefHeaders,
      data: {},
    })

    // Step B: Create subscription plan
    const createRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans`, {
      headers: chefHeaders,
      data: {
        name: 'Weekly Home Meals',
        description: 'Daily fresh home-cooked meals delivered weekly',
        type: 'SUBSCRIPTION',
        frequency: 'WEEKLY',
        basePrice: 12000,
        currency: 'PKR',
      },
    })
    expect([200, 201]).toContain(createRes.status())
    const plan = await createRes.json()
    expect(plan.type).toBe('SUBSCRIPTION')
    expect(plan.status).toBe('DRAFT')
    const planId = plan._id

    // Step C: Add a tier with the active dish (required before activation)
    const tierRes = await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/tiers`, {
      headers: chefHeaders,
      data: {
        tiers: [{ name: 'Standard', dishIds: [dishId], portionsPerDish: 1 }],
      },
    })
    expect(tierRes.status()).toBe(200)

    // Step D: Activate Plan
    const activateRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/activate`, {
      headers: chefHeaders,
      data: {},
    })
    expect(activateRes.status()).toBe(200)
    expect((await activateRes.json()).status).toBe('ACTIVE')

    // Step E: Pause Plan
    const pauseRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/pause`, {
      headers: chefHeaders,
      data: {},
    })
    expect(pauseRes.status()).toBe(200)
    expect((await pauseRes.json()).status).toBe('PAUSED')

    // Step F: Archive Plan
    const archiveRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/plans/${planId}/archive`, {
      headers: chefHeaders,
      data: {},
    })
    expect(archiveRes.status()).toBe(200)
    expect((await archiveRes.json()).status).toBe('ARCHIVED')
  })
})
