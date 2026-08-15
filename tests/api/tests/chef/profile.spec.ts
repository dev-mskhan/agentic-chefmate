import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'
const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

function uniqueEmail() {
  return `chef-onboard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

test.describe('Group 2: Chef Profile Routes & Onboarding Flow (/api/v1/chefs/me)', () => {

  test('1. Unauthenticated request to /api/v1/chefs/me returns 401 Unauthorized', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`)
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.statusCode).toBe(401)
    expect(body.message).toContain('Missing identity headers')
  })

  test('2. USER role can submit initial Chef Profile application draft', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // Step A: Signup as regular USER
    const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
      data: { email, password },
    })
    expect(signupRes.status()).toBe(200)
    const signupBody = await signupRes.json()
    const userId = signupBody.result.data.userId

    const userHeaders = {
      'x-user-id': userId,
      'x-user-role': 'USER',
      'x-user-email': email,
    }

    // Step B: USER role creates initial chef profile draft (protectedProcedure allows USER)
    const createRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: userHeaders,
      data: {
        displayName: 'Chef Fatima',
        bio: 'Expert in authentic Pakistani home cooking',
        cuisineSpecialties: ['PAKISTANI'],
      },
    })
    expect(createRes.status()).toBe(200)
    const createBody = await createRes.json()
    const chefProfile = createBody.result.data
    expect(chefProfile.displayName).toBe('Chef Fatima')
    expect(chefProfile.verificationStatus).toBe('PENDING')
    expect(chefProfile.accountState).toBe('INACTIVE')

    // Step C: USER can view their pending profile draft via GET /me
    const meRes = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`, {
      headers: userHeaders,
    })
    expect(meRes.status()).toBe(200)
    const meBody = await meRes.json()
    expect(meBody.displayName).toBe('Chef Fatima')
    expect(meBody.verificationStatus).toBe('PENDING')
  })

  test('3. Full Onboarding & Admin Approval Flow (USER -> Draft -> Admin Approval -> ACTIVE Status)', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // Step A: Signup
    const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
      data: { email, password },
    })
    expect(signupRes.status()).toBe(200)
    const signupBody = await signupRes.json()
    const userId = signupBody.result.data.userId

    const userHeaders = {
      'x-user-id': userId,
      'x-user-role': 'USER',
      'x-user-email': email,
    }

    // Step B: Submit Chef Application
    const createRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: userHeaders,
      data: {
        displayName: 'Chef Master Ali',
        bio: 'Specializing in BBQ and Karahi',
        cuisineSpecialties: ['PAKISTANI'],
      },
    })
    expect(createRes.status()).toBe(200)
    const chefId = (await createRes.json()).result.data._id

    // Step C: Admin approves application (verificationStatus: ACTIVE, accountState: ACTIVE)
    const adminHeaders = {
      'x-user-id': 'admin-id-001',
      'x-user-role': 'ADMIN',
      'x-user-email': 'admin@chefmate.test',
    }

    const approveRes = await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
      headers: adminHeaders,
      data: {
        chefId,
        verificationStatus: 'ACTIVE',
        accountState: 'ACTIVE',
        reason: 'Application documents verified by Admin',
      },
    })
    expect(approveRes.status()).toBe(200)

    // Step D: Verify profile status is updated to ACTIVE
    const meRes = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/me`, {
      headers: {
        'x-user-id': userId,
        'x-user-role': 'CHEF',
        'x-user-email': email,
      },
    })
    expect(meRes.status()).toBe(200)
    const meBody = await meRes.json()
    expect(meBody.verificationStatus).toBe('ACTIVE')
    expect(meBody.accountState).toBe('ACTIVE')
  })
})
