import { test, expect } from '@playwright/test'
import { uniqueEmail, signup, trpcGet, changeRoleDirect } from '../../helpers/auth'

/**
 * Role-change flow.
 *
 * changeRole is an INTERNAL tRPC procedure on auth-service, invoked
 * service-to-service by admin-service with x-internal-secret. The gateway
 * strips x-internal-secret (proxy.ts), so we call auth-service directly to
 * mirror the real cross-service call — no mock, real HTTP + real Mongo write.
 *
 * After a role change, the NEXT issued access token carries the new role.
 * (Existing access tokens keep their original role until they expire/refresh.)
 */

test.describe('Phase 1 — Role Changes (internal changeRole)', () => {
  test('1. changeRole USER → CHEF — 200, next signin reflects new role', async ({ request }) => {
    const email = uniqueEmail('role')
    const session = await signup(request, email)
    expect(session.role).toBe('USER')

    const { status, body } = await changeRoleDirect(request, session.userId, 'CHEF')
    expect(status).toBe(200)
    expect(body.result.data.newRole).toBe('CHEF')
    expect(body.result.data.oldRole).toBe('USER')

    // Sign in again to get a freshly-issued token carrying the new role,
    // then call me to confirm the persisted role is CHEF.
    const { signin } = await import('../../helpers/auth')
    const signinRes = await signin(request, email, 'AuthTest123!')
    expect(signinRes.status).toBe(200)

    const me = await trpcGet(request, 'me')
    expect(me.status).toBe(200)
    expect(me.data.role).toBe('CHEF')
  })

  test('2. changeRole for unknown user — 404', async ({ request }) => {
    const fakeId = '64abcdef0123456789012345' // 24-char hex ObjectId, not in DB
    const { status, body } = await changeRoleDirect(request, fakeId, 'ADMIN')
    // Single-procedure error shape: { error: { data: { httpStatus } } }
    const httpStatus = body?.error?.data?.httpStatus ?? status
    expect(httpStatus).toBe(404)
  })

  test('3. changeRole rejects an invalid role — 400 validation', async ({ request }) => {
    const email = uniqueEmail('role-invalid')
    const session = await signup(request, email)

    const { AUTH_SERVICE_URL, INTERNAL_SECRET } = await import('../../helpers/auth')
    const res = await request.post(`${AUTH_SERVICE_URL}/api/v1/auth/trpc/changeRole`, {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      data: { userId: session.userId, newRole: 'SUPERUSER' },
    })
    const body = await res.json()
    const httpStatus = body?.error?.data?.httpStatus ?? res.status()
    expect(httpStatus).toBe(400)
  })
})
