import { test, expect } from '@playwright/test'

function uniqueEmail() {
  return `chef-gateway-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

test.describe('Gateway Proxy & Cookie Auth for Chef Service (/api/v1/chefs)', () => {

  test('Cookie Auth Flow via Gateway: Signup -> Submit Chef Application -> GET /api/v1/chefs/me', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // 1. Sign up via Gateway — sets signed HTTP-only access cookie
    const signupRes = await request.post('/api/v1/auth/trpc/signup', {
      data: { email, password },
    })
    expect(signupRes.status()).toBe(200)

    const signupBody = await signupRes.json()
    const userId = signupBody.result.data.userId

    // 2. Submit initial chef profile application draft (direct service helper call)
    const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'
    const createRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: {
        'x-user-id': userId,
        'x-user-role': 'USER',
        'x-user-email': email,
      },
      data: {
        displayName: 'Chef Gateway Cookie Test',
        bio: 'Testing cookie authentication via Gateway',
        cuisineSpecialties: ['INDIAN'],
      },
    })
    expect(createRes.status()).toBe(200)

    // 3. Access /api/v1/chefs/me via Gateway — Gateway authenticates using the stored access cookie
    const meRes = await request.get('/api/v1/chefs/me')
    expect(meRes.status()).toBe(200)
    const meBody = await meRes.json()
    expect(meBody.displayName).toBe('Chef Gateway Cookie Test')
  })
})
