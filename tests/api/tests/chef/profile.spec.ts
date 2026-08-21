import { test, expect } from '@playwright/test'
import { setupActiveChef, uniqueEmail, STRONG_PASSWORD, chefPost, chefGet, chefPatch } from '../../helpers/chef'

const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

test.describe('Phase 3A - Chef Profile (via Gateway)', () => {

  test('1. Create chef profile - 201, PENDING/INACTIVE', async ({ request }) => {
    const email = uniqueEmail('profile')
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: STRONG_PASSWORD } })
    const res = await chefPost(request, '', { displayName: 'Chef Test', bio: 'A test chef', cuisineSpecialties: ['PAKISTANI', 'BBQ'] })
    expect(res.status).toBe(201)
    expect(res.data._id).toBeTruthy()
    expect(res.data.verificationStatus).toBe('PENDING')
    expect(res.data.accountState).toBe('INACTIVE')
  })

  test('2. Duplicate chef profile - 409', async ({ request }) => {
    const email = uniqueEmail('dup')
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: STRONG_PASSWORD } })
    await chefPost(request, '', { displayName: 'Chef Dup', cuisineSpecialties: ['PAKISTANI'] })
    const second = await chefPost(request, '', { displayName: 'Chef Dup 2', cuisineSpecialties: ['BBQ'] })
    expect(second.status).toBe(409)
  })

  test('3. Invalid cuisine -> 400', async ({ request }) => {
    const email = uniqueEmail('badcuisine')
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: STRONG_PASSWORD } })
    const res = await chefPost(request, '', { displayName: 'Bad Cuisine', cuisineSpecialties: ['MEXICAN'] })
    expect(res.status).toBe(400)
  })

  test('4. Get own profile via GET /me', async ({ request }) => {
    const session = await setupActiveChef(request)
    const res = await chefGet(request, '/me')
    expect(res.status).toBe(200)
    expect(res.data._id).toBe(session.chefId)
  })

  test('5. Update profile via PATCH /me', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPatch(request, '/me', { displayName: 'Updated Name', bio: 'New bio' })
    expect(res.status).toBe(200)
    expect(res.data.displayName).toBe('Updated Name')
  })

  test('6. Public profile via GET /:chefId', async ({ request }) => {
    const session = await setupActiveChef(request)
    const res = await chefGet(request, `/${session.chefId}`)
    expect(res.status).toBe(200)
    expect(res.data._id).toBe(session.chefId)
  })

  test('7. Chef status via GET /:chefId/status', async ({ request }) => {
    const session = await setupActiveChef(request)
    const res = await chefGet(request, `/${session.chefId}/status`)
    expect(res.status).toBe(200)
    expect(res.data.verificationStatus).toBe('ACTIVE')
  })

  test('8. Admin approval promotes USER -> CHEF', async ({ request }) => {
    const email = uniqueEmail('approve')
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: STRONG_PASSWORD } })
    const createRes = await chefPost(request, '', { displayName: 'Chef Approve', cuisineSpecialties: ['PAKISTANI'] })
    const chefId = createRes.data._id
    const { request: pw } = await import('@playwright/test')
    const adminCtx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await adminCtx.post('/api/v1/auth/trpc/signin', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      const approve = await chefPatch(adminCtx, `/${chefId}/status`, { verificationStatus: 'ACTIVE', accountState: 'ACTIVE' })
      expect(approve.status).toBe(200)
    } finally { await adminCtx.dispose() }
    const signin = await request.post('/api/v1/auth/trpc/signin', { data: { email, password: STRONG_PASSWORD } })
    expect((await signin.json()).result.data.role).toBe('CHEF')
  })

  test('9. Admin rejection', async ({ request }) => {
    const email = uniqueEmail('reject')
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: STRONG_PASSWORD } })
    const createRes = await chefPost(request, '', { displayName: 'Chef Reject', cuisineSpecialties: ['PAKISTANI'] })
    const { request: pw } = await import('@playwright/test')
    const adminCtx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await adminCtx.post('/api/v1/auth/trpc/signin', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      const reject = await chefPatch(adminCtx, `/${createRes.data._id}/status`, { verificationStatus: 'REJECTED', reason: 'Incomplete' })
      expect(reject.status).toBe(200)
      expect(reject.data.verificationStatus).toBe('REJECTED')
    } finally { await adminCtx.dispose() }
  })

  test('10. Admin suspension', async ({ request }) => {
    const session = await setupActiveChef(request)
    const { request: pw } = await import('@playwright/test')
    const adminCtx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await adminCtx.post('/api/v1/auth/trpc/signin', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
      const suspend = await chefPatch(adminCtx, `/${session.chefId}/status`, { verificationStatus: 'SUSPENDED', reason: 'Violation' })
      expect(suspend.status).toBe(200)
      expect(suspend.data.verificationStatus).toBe('SUSPENDED')
    } finally { await adminCtx.dispose() }
  })

  test('11. Non-admin cannot update chef status -> 403', async ({ request }) => {
    const session = await setupActiveChef(request)
    const res = await chefPatch(request, `/${session.chefId}/status`, { verificationStatus: 'ACTIVE' })
    expect(res.status).toBe(403)
  })

  test('12. Unauthenticated GET /me -> 401', async ({ request }) => {
    const res = await chefGet(request, '/me')
    expect(res.status).toBe(401)
  })

  test('13. Unauthenticated POST create -> 401', async ({ request }) => {
    const res = await chefPost(request, '', { displayName: 'No Auth', cuisineSpecialties: ['PAKISTANI'] })
    expect(res.status).toBe(401)
  })
})