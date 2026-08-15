import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'
const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

function uniqueEmail() {
  return `chef-dish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

test.describe('Group 3: Dish Management Routes (/api/v1/chefs/me/dishes)', () => {

  test('1. Unauthenticated request to create dish returns 401 Unauthorized', async ({ request }) => {
    const res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
      data: { name: 'Test Dish', price: 500, cuisine: 'PAKISTANI' },
    })
    expect(res.status()).toBe(401)
  })

  test('2. Create Dish Draft (POST /api/v1/chefs/me/dishes)', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // Step A: Signup & promote to CHEF
    const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
      data: { email, password },
    })
    expect(signupRes.status()).toBe(200)
    const userId = (await signupRes.json()).result.data.userId

    await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/changeRole`, {
      data: { userId, newRole: 'CHEF' },
    })

    const chefHeaders = {
      'x-user-id': userId,
      'x-user-role': 'CHEF',
      'x-user-email': email,
    }

    // Step B: Create Chef Profile
    const profileRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: chefHeaders,
      data: { displayName: 'Chef Biryani Master', cuisineSpecialties: ['PAKISTANI'] },
    })
    expect(profileRes.status()).toBe(200)

    // Step C: Create Dish
    const createDishRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
      headers: chefHeaders,
      data: {
        name: 'Special Dum Biryani',
        description: 'Authentic slow-cooked mutton biryani',
        cuisine: 'PAKISTANI',
        price: 1200,
        portionInfo: 'Serves 2-3 persons',
        dietaryTags: ['HALAL'],
      },
    })

    expect([200, 201]).toContain(createDishRes.status())
    const dish = await createDishRes.json()
    expect(dish.name).toBe('Special Dum Biryani')
    expect(dish.price).toBe(1200)
    expect(dish.status).toBe('DRAFT')
  })

  test('3. Update, Activate, Deactivate & Archive Dish Lifecycle', async ({ request }) => {
    const email = uniqueEmail()
    const password = 'ChefPassword123!'

    // Step A: Setup Chef Profile
    const signupRes = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/signup`, {
      data: { email, password },
    })
    const userId = (await signupRes.json()).result.data.userId

    const userHeaders = {
      'x-user-id': userId,
      'x-user-role': 'USER',
      'x-user-email': email,
    }

    const profileRes = await request.post(`${CHEF_SERVICE_URL}/trpc/createChefProfile`, {
      headers: userHeaders,
      data: { displayName: 'Chef Karahi Expert', cuisineSpecialties: ['PAKISTANI'] },
    })
    expect(profileRes.status()).toBe(200)
    const profileJson = await profileRes.json()
    const chefId = profileJson.result?.data?._id ?? profileJson._id

    // Admin approves chef so dish activation is allowed (triggers auto-role promotion to CHEF)
    const approveRes = await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
      headers: { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' },
      data: { chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
    })
    expect(approveRes.status()).toBe(200)

    const chefHeaders = {
      'x-user-id': userId,
      'x-user-role': 'CHEF',
      'x-user-email': email,
    }

    // Step B: Create Dish
    const createRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes`, {
      headers: chefHeaders,
      data: {
        name: 'Chicken Karahi',
        description: 'Desi ghee chicken karahi',
        cuisine: 'PAKISTANI',
        price: 1500,
      },
    })
    expect(createRes.status()).toBe(200)
    const dishData = await createRes.json()
    const dishId = dishData._id

    // Step C: Update Dish (PATCH /me/dishes/:dishId)
    const updateRes = await request.patch(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}`, {
      headers: chefHeaders,
      data: { price: 1600, description: 'Desi ghee special chicken karahi' },
    })
    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json()
    expect(updated.price).toBe(1600)

    // Step D: Activate Dish (POST /me/dishes/:dishId/activate)
    const activateRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/activate`, {
      headers: chefHeaders,
      data: {},
    })
    if (activateRes.status() !== 200) {
      console.log('Activate failed:', activateRes.status(), await activateRes.text())
    }
    expect(activateRes.status()).toBe(200)
    expect((await activateRes.json()).status).toBe('ACTIVE')

    // Step E: Deactivate Dish (POST /me/dishes/:dishId/deactivate)
    const deactivateRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/deactivate`, {
      headers: chefHeaders,
      data: {},
    })
    expect(deactivateRes.status()).toBe(200)
    expect((await deactivateRes.json()).status).toBe('INACTIVE')

    // Step F: Archive Dish (POST /me/dishes/:dishId/archive)
    const archiveRes = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/dishes/${dishId}/archive`, {
      headers: chefHeaders,
      data: {},
    })
    expect(archiveRes.status()).toBe(200)
    expect((await archiveRes.json()).status).toBe('ARCHIVED')
  })
})
