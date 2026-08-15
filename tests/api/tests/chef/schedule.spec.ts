import { test, expect } from '@playwright/test'

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'
const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

function uniqueEmail() {
  return `chef-sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
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
    data: { displayName: 'Chef Schedule Test', cuisineSpecialties: ['PAKISTANI'] },
  })
  const chefId = (await profileRes.json()).result.data._id

  await request.post(`${CHEF_SERVICE_URL}/trpc/updateChefStatus`, {
    headers: { 'x-user-id': 'admin-01', 'x-user-role': 'ADMIN', 'x-user-email': 'admin@chefmate.test' },
    data: { chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
  })

  return { userId, email, chefId }
}

test.describe('Group 4: Schedule Routes (/api/v1/chefs/me/schedule)', () => {

  test('1. Unauthenticated request to /api/v1/chefs/me/schedule returns 401', async ({ request }) => {
    const res = await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
      headers: { 'Content-Type': 'application/json' },
      data: { recurringDays: [] },
    })
    expect(res.status()).toBe(401)
  })

  test('2. Upsert weekly schedule (PUT /api/v1/chefs/me/schedule)', async ({ request }) => {
    const { userId, email } = await setupActiveChef(request)
    const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

    const res = await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
      headers: chefHeaders,
      data: {
        recurringDays: [
          { dayOfWeek: 'MON', windows: [{ openTime: '09:00', closeTime: '17:00' }], isActive: true },
          { dayOfWeek: 'WED', windows: [{ openTime: '10:00', closeTime: '18:00' }], isActive: true },
          { dayOfWeek: 'FRI', windows: [{ openTime: '11:00', closeTime: '19:00' }], isActive: true },
        ],
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.recurringDays).toHaveLength(3)
    expect(body.recurringDays[0].dayOfWeek).toBe('MON')
  })

  test('3. Add Blackout Date (POST /api/v1/chefs/me/schedule/blackout)', async ({ request }) => {
    const { userId, email } = await setupActiveChef(request)
    const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

    // Must create schedule first
    await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
      headers: chefHeaders,
      data: { recurringDays: [] },
    })

    // reason must be one of: VACATION | HOLIDAY | FULLY_BOOKED | PERSONAL | OTHER
    const res = await request.post(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule/blackout`, {
      headers: chefHeaders,
      data: { date: '2026-12-25', reason: 'HOLIDAY', note: 'Christmas Day' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.date).toBe('2026-12-25')
    expect(body.reason).toBe('HOLIDAY')
  })

  test('4. Update Capacity (PATCH /api/v1/chefs/me/schedule/capacity)', async ({ request }) => {
    const { userId, email } = await setupActiveChef(request)
    const chefHeaders = { 'x-user-id': userId, 'x-user-role': 'CHEF', 'x-user-email': email }

    // Must create schedule first
    await request.put(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule`, {
      headers: chefHeaders,
      data: { recurringDays: [] },
    })

    // maxOrdersPerDay is the correct field (no maxOrdersPerSlot in schema)
    const res = await request.patch(`${CHEF_SERVICE_URL}/api/v1/chefs/me/schedule/capacity`, {
      headers: chefHeaders,
      data: { maxOrdersPerDay: 20, prepTimeMinutes: 30, leadTimeHours: 2 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.capacity?.maxOrdersPerDay).toBe(20)
    expect(body.capacity?.prepTimeMinutes).toBe(30)
    expect(body.capacity?.leadTimeHours).toBe(2)
  })
})
