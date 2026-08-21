import { test, expect } from '@playwright/test'
import {
  uniqueEmail,
  STRONG_PASSWORD,
  signup,
  signin,
  trpcPost,
  trpcGet,
  errorHttpStatus,
  errorMessage,
} from '../../helpers/auth'

test.describe('Phase 1 — Auth Foundation (via Gateway)', () => {
  test.describe.configure({ mode: 'serial' })

  test('1. Signup — 200, returns userId/email/role, sets cookies', async ({ request }) => {
    const email = uniqueEmail('signup')
    const { status, data } = await trpcPost(request, 'signup', { email, password: STRONG_PASSWORD })

    expect(status).toBe(200)
    expect(data.userId).toBeTruthy()
    expect(data.email).toBe(email)
    expect(data.role).toBe('USER')

    // Signed access cookie should be present (path /) for subsequent calls.
    const cookies = await request.storageState()
    const access = cookies.cookies.find((c) => c.name === 'access' && c.path === '/')
    expect(access).toBeTruthy()
  })

  test('2. Duplicate signup — 409 Conflict', async ({ request }) => {
    const email = uniqueEmail('dup')
    const first = await trpcPost(request, 'signup', { email, password: STRONG_PASSWORD })
    expect(first.status).toBe(200)

    const second = await trpcPost(request, 'signup', { email, password: STRONG_PASSWORD })
    expect(second.status).toBe(409)
    expect(errorHttpStatus(second.error)).toBe(409)
    expect(errorMessage(second.error)).toMatch(/already registered/i)
  })

  test('3. Signin — 200 with valid credentials', async ({ request }) => {
    const email = uniqueEmail('signin')
    await signup(request, email)

    const { status, data } = await signin(request, email, STRONG_PASSWORD)
    expect(status).toBe(200)
    expect(data.userId).toBeTruthy()
    expect(data.email).toBe(email)
    expect(data.role).toBe('USER')
  })

  test('4. Wrong password — 401 Unauthorized', async ({ request }) => {
    const email = uniqueEmail('wrongpw')
    await signup(request, email)

    const { status, error } = await signin(request, email, 'DefinitelyWrong456!')
    expect(status).toBe(401)
    expect(errorHttpStatus(error)).toBe(401)
    expect(errorMessage(error)).toMatch(/invalid email or password/i)
  })

  test('5. me — 200 with valid access cookie, returns profile', async ({ request }) => {
    const email = uniqueEmail('me')
    const session = await signup(request, email)

    // The access cookie was set by signup and is persisted on `request`.
    const { status, data } = await trpcGet(request, 'me')
    expect(status).toBe(200)
    expect(data.userId).toBe(session.userId)
    expect(data.email).toBe(email)
    expect(data.role).toBe('USER')
    expect(data.emailVerified).toBe(false)
    expect(data.hasGoogleAccount).toBe(false)
  })

  test('6. Unauthorized — me without access cookie returns 401', async ({ request }) => {
    // Fresh request context holds no cookies.
    const { status, error } = await trpcGet(request, 'me')
    expect(status).toBe(401)
    expect(errorHttpStatus(error)).toBe(401)
  })

  test('7. Unauthorized — protected downstream route without token returns 401', async ({ request }) => {
    // /api/v1/users requires auth (routes.yaml). A bare GET should be
    // rejected by the gateway's auth-verify hook before reaching user-service.
    const res = await request.get('/api/v1/users/trpc/getMe')
    expect(res.status()).toBe(401)
  })

  test('8. Signout — 200, clears cookies, subsequent me returns 401', async ({ request }) => {
    const email = uniqueEmail('signout')
    await signup(request, email)

    // Confirm we are authenticated before signout.
    const before = await trpcGet(request, 'me')
    expect(before.status).toBe(200)

    const { status, data } = await trpcPost(request, 'signout', {})
    expect(status).toBe(200)
    expect(data.success).toBe(true)

    // After signout, the access cookie is blacklisted/cleared → me 401.
    const after = await trpcGet(request, 'me')
    expect(after.status).toBe(401)
  })

  test('9. Forbidden — wrong role cannot access role-gated route', async ({ request }) => {
    // A fresh USER signs up. /api/v1/admin requires ADMIN role.
    await signup(request, uniqueEmail('forbidden'))

    const res = await request.get('/api/v1/admin/trpc/getAdminOverview')
    // USER token is valid (401 not raised) but role not allowed → 403.
    expect(res.status()).toBe(403)
  })
})
