import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'
const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

function uniqueEmail() {
  return `chef-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

test.describe('Group 2: Chef Profile Routes & Onboarding Lifecycle (/api/v1/chefs/me)', () => {

  test('1. Unauthenticated request to /api/v1/chefs/me returns 401 Unauthorized', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`)
    expect(res.status()).toBe(401)
  })

  test('2. USER role attempting to access /api/v1/chefs/me returns 403 Forbidden', async ({ request }) => {
    const userHeaders = {
      'x-user-id': `user-reg-${Date.now()}`,
      'x-user-role': 'USER',
      'x-user-email': 'regularuser@chefmate.test',
    }

    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`, {
      headers: userHeaders,
    })

    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.message).toContain('Chef role required')
  })

  test('3. Full Chef Onboarding Flow: Signup -> Role Changed to CHEF -> Access /api/v1/chefs/me allowed', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // Step A: Signup as standard user
    const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
      data: { email, password },
    })
    expect(signupRes.status()).toBe(200)
    const signupBody = await signupRes.json()
    const userId = signupBody.result.data.userId
    expect(signupBody.result.data.role).toBe('USER')

    // Step B: Admin approves application -> Role changed to CHEF
    const changeRoleRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/changeRole`, {
      data: { userId, newRole: 'CHEF' },
    })
    expect(changeRoleRes.status()).toBe(200)

    // Step C: Promoted CHEF accesses /api/v1/chefs/me with updated CHEF identity
    const chefHeaders = {
      'x-user-id': userId,
      'x-user-role': 'CHEF',
      'x-user-email': email,
    }

    // Step D: Create Chef Profile first
    const createRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: chefHeaders,
      data: {
        displayName: 'Chef Fatima',
        bio: 'Expert in authentic Pakistani cuisines',
        cuisineSpecialties: ['PAKISTANI'],
      },
    })
    expect(createRes.status()).toBe(200)

    // Step E: Fetch profile via GET /api/v1/chefs/me
    const meRes = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`, {
      headers: chefHeaders,
    })

    expect(meRes.status()).toBe(200)
    const meBody = await meRes.json()
    expect(meBody.displayName).toBe('Chef Fatima')
    expect(meBody.cuisineSpecialties).toContain('PAKISTANI')
  })
})
