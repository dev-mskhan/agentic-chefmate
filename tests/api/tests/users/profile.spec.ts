import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://127.0.0.1:3001'
const USER_SERVICE_URL = process.env['USER_SERVICE_URL'] ?? 'http://127.0.0.1:3002'

function uniqueEmail() {
  return `user-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
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

  return { userId, email, userHeaders }
}

test.describe('User Service: Profile & Address Book (/trpc/*)', () => {

  test('1. Unauthenticated request to /trpc/getMe returns 401', async ({ request }) => {
    const res = await request.get(`${USER_SERVICE_URL}/trpc/getMe`)
    expect(res.status()).toBe(401)
  })

  test('2. Profile Management (updateMe & getMe)', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Update Profile Details
    const updateRes = await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
      headers: userHeaders,
      data: {
        firstName: 'Ali',
        lastName: 'Khan',
        phone: '+923001234567',
      },
    })
    expect(updateRes.status()).toBe(200)
    const updateBody = (await updateRes.json()).result.data
    expect(updateBody.firstName).toBe('Ali')
    expect(updateBody.lastName).toBe('Khan')
    expect(updateBody.phone).toBe('+923001234567')

    // Step B: Get Profile (tRPC Query -> GET)
    const getRes = await request.get(`${USER_SERVICE_URL}/trpc/getMe`, {
      headers: userHeaders,
    })
    expect(getRes.status()).toBe(200)
    const getBody = (await getRes.json()).result.data
    expect(getBody.firstName).toBe('Ali')
    expect(getBody.lastName).toBe('Khan')
  })

  test('3. Address Book Lifecycle (create, get, update, setDefault, delete)', async ({ request }) => {
    const { userHeaders } = await setupRegisteredUser(request)

    // Step A: Ensure profile exists
    await request.post(`${USER_SERVICE_URL}/trpc/updateMe`, {
      headers: userHeaders,
      data: { firstName: 'Fatima', lastName: 'Ahmed' },
    })

    // Step B: Create Address
    const createAddrRes = await request.post(`${USER_SERVICE_URL}/trpc/createAddress`, {
      headers: userHeaders,
      data: {
        label: 'HOME',
        addressLine: 'House 123, Street 4, Sector F-8/2',
        city: 'Islamabad',
        province: 'Federal Capital',
        postalCode: '44000',
        deliveryInstructions: 'Ring the front bell',
        isDefault: true,
      },
    })
    expect(createAddrRes.status()).toBe(200)
    const addr = (await createAddrRes.json()).result.data
    expect(addr.label).toBe('HOME')
    expect(addr.city).toBe('Islamabad')
    const addressId = addr._id

    // Step C: Get Addresses (tRPC Query -> GET)
    const getAddrsRes = await request.get(`${USER_SERVICE_URL}/trpc/getAddresses`, {
      headers: userHeaders,
    })
    expect(getAddrsRes.status()).toBe(200)
    const addresses = (await getAddrsRes.json()).result.data
    expect(addresses.length).toBeGreaterThanOrEqual(1)
    expect(addresses[0]._id).toBe(addressId)

    // Step D: Update Address (field is named 'id')
    const updateAddrRes = await request.post(`${USER_SERVICE_URL}/trpc/updateAddress`, {
      headers: userHeaders,
      data: {
        id: addressId,
        addressLine: 'House 123-B, Street 4, Sector F-8/2',
        city: 'Islamabad',
      },
    })
    expect(updateAddrRes.status()).toBe(200)

    // Step E: Set Default Address (field is named 'id')
    const defaultRes = await request.post(`${USER_SERVICE_URL}/trpc/setDefaultAddress`, {
      headers: userHeaders,
      data: { id: addressId },
    })
    expect(defaultRes.status()).toBe(200)

    // Step F: Delete Address (field is named 'id')
    const deleteRes = await request.post(`${USER_SERVICE_URL}/trpc/deleteAddress`, {
      headers: userHeaders,
      data: { id: addressId },
    })
    expect(deleteRes.status()).toBe(200)
  })
})
