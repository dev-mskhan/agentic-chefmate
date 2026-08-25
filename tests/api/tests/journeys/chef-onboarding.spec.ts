import { test, expect, request as requestFactory } from '@playwright/test'
import {
  chefGet,
  chefPatch,
  chefPost,
  chefPut,
  STRONG_PASSWORD,
  uniqueEmail,
} from '../../helpers/chef'

const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

test.describe('Journey 1 -- chef onboarding through the gateway', () => {
  test.setTimeout(120_000)

  test('signup to approved, activated, scheduled chef', async ({ request }) => {
    const email = uniqueEmail('journey-chef')
    const signup = await request.post('/api/v1/auth/trpc/signup', {
      data: { email, password: STRONG_PASSWORD },
    })
    expect(signup.status()).toBe(200)
    const signupBody = await signup.json()
    const userId = signupBody.result?.data?.userId
    expect(userId).toBeTruthy()

    const profile = await chefPost(request, '', {
      displayName: `Journey Chef ${Date.now()}`,
      bio: 'Full onboarding journey chef',
      cuisineSpecialties: ['PAKISTANI'],
    })
    expect(profile.status).toBe(201)
    const chefId = profile.data._id
    expect(chefId).toBeTruthy()

    const pending = await chefGet(request, `/${chefId}/status`)
    expect(pending.status).toBe(200)
    expect(pending.data.verificationStatus).not.toBe('ACTIVE')

    const admin = await requestFactory.newContext({ baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:3000' })
    try {
      const adminSignin = await admin.post('/api/v1/auth/trpc/signin', {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      })
      expect(adminSignin.status()).toBe(200)
      const approval = await admin.patch(`/api/v1/chefs/${chefId}/status`, {
        data: { verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
      })
      expect(approval.status()).toBe(200)
    } finally {
      await admin.dispose()
    }

    const chefSignin = await request.post('/api/v1/auth/trpc/signin', {
      data: { email, password: STRONG_PASSWORD },
    })
    expect(chefSignin.status()).toBe(200)
    expect((await chefSignin.json()).result?.data?.role).toBe('CHEF')

    const dish = await chefPost(request, '/me/dishes', {
      name: `Journey Dish ${Date.now()}`,
      description: 'Dish created during the onboarding journey',
      price: 500,
      currency: 'PKR',
      cuisine: 'PAKISTANI',
      dietaryTags: ['HALAL'],
      allergens: [],
      occasionTags: [],
    })
    expect(dish.status).toBe(200)
    const dishId = dish.data._id ?? dish.data.id
    const dishActivation = await chefPost(request, `/me/dishes/${dishId}/activate`, {})
    expect(dishActivation.status).toBe(200)
    const activeDish = await chefGet(request, `/${chefId}/dishes/${dishId}`)
    expect(activeDish.status).toBe(200)
    expect(activeDish.data.status).toBe('ACTIVE')

    const plan = await chefPost(request, '/me/plans', {
      name: `Journey Plan ${Date.now()}`,
      description: 'Plan created during the onboarding journey',
      type: 'ONE_OFF',
      basePrice: 1000,
      currency: 'PKR',
    })
    expect(plan.status).toBe(200)
    const planId = plan.data._id ?? plan.data.id
    const tiers = await chefPut(request, `/me/plans/${planId}/tiers`, {
      tiers: [{
        name: 'Standard',
        description: 'Standard onboarding tier',
        dishIds: [dishId],
        portionsPerDish: 1,
      }],
    })
    expect(tiers.status).toBe(200)
    const planActivation = await chefPost(request, `/me/plans/${planId}/activate`, {})
    expect(planActivation.status).toBe(200)
    const activePlans = await request.get(`/api/v1/chefs/${chefId}/plans`, {
      params: { status: 'ACTIVE' },
    })
    expect(activePlans.status()).toBe(200)
    expect(JSON.stringify(await activePlans.json())).toContain(planId)

    const recurringDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      .map((dayOfWeek) => ({
        dayOfWeek,
        windows: [{ openTime: '08:00', closeTime: '23:00' }],
        isActive: true,
      }))
    const schedule = await chefPut(request, '/me/schedule', { recurringDays })
    expect(schedule.status).toBe(200)
    const savedSchedule = await chefGet(request, `/${chefId}/schedule`)
    expect(savedSchedule.status).toBe(200)
    expect(savedSchedule.data.recurringDays ?? savedSchedule.data.days).toBeTruthy()

    const availability = await request.get(`/api/v1/chefs/${chefId}/availability`, {
      params: { date: '2026-12-15' },
    })
    expect(availability.status()).toBe(200)
  })
})
