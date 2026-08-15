import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://127.0.0.1:3001'
const USER_SERVICE_URL = process.env['USER_SERVICE_URL'] ?? 'http://127.0.0.1:3002'

function uniqueEmail() {
  return `user-pref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

async function setupRegisteredUser(request: any) {
  const email = uniqueEmail()
  const password = 'UserPassword123!'

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

  // Ensure initial profile document exists
  await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
    headers: userHeaders,
    data: { firstName: 'Test', lastName: 'User' },
  })

  return { userId, email, userHeaders }
}

test.describe('User Service: Preferences, Allergies, Favorites & Notifications', () => {

  test('1. Dietary Preferences & Spice Level Lifecycle', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Update Preferences (Valid enum: HALAL, VEGETARIAN, etc.)
    const updateRes = await request.post(`${USER_SERVICE_URL}/trpc/updatePreferences`, {
      headers: userHeaders,
      data: {
        dietaryPreferences: ['HALAL', 'VEGETARIAN'],
        spiceLevel: 'MEDIUM',
        favoriteCuisines: ['PAKISTANI', 'MIDDLE_EASTERN'],
      },
    })
    expect(updateRes.status()).toBe(200)
    const updated = (await updateRes.json()).result.data
    expect(updated.dietaryPreferences).toContain('HALAL')
    expect(updated.spiceLevel).toBe('MEDIUM')

    // Step B: Get Preferences (tRPC Query -> GET)
    const getRes = await request.get(`${USER_SERVICE_URL}/trpc/getPreferences`, {
      headers: userHeaders,
    })
    expect(getRes.status()).toBe(200)
    const prefs = (await getRes.json()).result.data
    expect(prefs.dietaryPreferences).toContain('HALAL')
    expect(prefs.spiceLevel).toBe('MEDIUM')
  })

  test('2. Allergies Management (setAllergies & getAllergies)', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Set Allergies (Valid enum: PEANUTS, SHELLFISH, MILK_DAIRY, etc.)
    const setRes = await request.post(`${USER_SERVICE_URL}/trpc/setAllergies`, {
      headers: userHeaders,
      data: {
        allergies: ['PEANUTS', 'SHELLFISH', 'MILK_DAIRY'],
      },
    })
    expect(setRes.status()).toBe(200)
    const allergiesList = (await setRes.json()).result.data
    expect(allergiesList).toContain('PEANUTS')
    expect(allergiesList).toContain('SHELLFISH')

    // Step B: Get Allergies (tRPC Query -> GET)
    const getRes = await request.get(`${USER_SERVICE_URL}/trpc/getAllergies`, {
      headers: userHeaders,
    })
    expect(getRes.status()).toBe(200)
    const result = (await getRes.json()).result.data
    expect(result).toContain('PEANUTS')
  })

  test('3. Favorites Management (add & remove chef/dish favorites)', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Add favorite chef
    const addChefRes = await request.post(`${USER_SERVICE_URL}/trpc/addFavoriteChef`, {
      headers: userHeaders,
      data: { chefId: 'chef_test_id_123' },
    })
    expect(addChefRes.status()).toBe(200)
    const favorites = (await addChefRes.json()).result.data
    expect(favorites.chefIds).toContain('chef_test_id_123')

    // Step B: Add favorite dish
    const addDishRes = await request.post(`${USER_SERVICE_URL}/trpc/addFavoriteDish`, {
      headers: userHeaders,
      data: { dishId: 'dish_test_id_456' },
    })
    expect(addDishRes.status()).toBe(200)

    // Step C: Get Favorites (tRPC Query -> GET)
    const getFavsRes = await request.get(`${USER_SERVICE_URL}/trpc/getFavorites`, {
      headers: userHeaders,
    })
    expect(getFavsRes.status()).toBe(200)
    const allFavs = (await getFavsRes.json()).result.data
    expect(allFavs.chefIds).toContain('chef_test_id_123')
    expect(allFavs.dishIds).toContain('dish_test_id_456')

    // Step D: Remove favorite chef
    const removeRes = await request.post(`${USER_SERVICE_URL}/trpc/removeFavoriteChef`, {
      headers: userHeaders,
      data: { chefId: 'chef_test_id_123' },
    })
    expect(removeRes.status()).toBe(200)
    const updatedFavs = (await removeRes.json()).result.data
    expect(updatedFavs.chefIds).not.toContain('chef_test_id_123')
  })

  test('4. Notification Preferences (getNotifPrefs & updateNotifPrefs)', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Update Notification Channels & Quiet Hours
    const updateRes = await request.post(`${USER_SERVICE_URL}/trpc/updateNotifPrefs`, {
      headers: userHeaders,
      data: {
        channels: { push: true, email: true, sms: false, inApp: true },
        categories: { orderUpdates: true, chefMessages: true, promotions: false },
        quietHours: { enabled: true, start: '22:00', end: '07:00' },
      },
    })
    expect(updateRes.status()).toBe(200)

    // Step B: Get Notification Preferences (tRPC Query -> GET)
    const getRes = await request.get(`${USER_SERVICE_URL}/trpc/getNotifPrefs`, {
      headers: userHeaders,
    })
    expect(getRes.status()).toBe(200)
    const notifPrefs = (await getRes.json()).result.data
    expect(notifPrefs.channels.push).toBe(true)
    expect(notifPrefs.channels.sms).toBe(false)
    expect(notifPrefs.categories.promotions).toBe(false)
    expect(notifPrefs.quietHours.enabled).toBe(true)
  })
})
