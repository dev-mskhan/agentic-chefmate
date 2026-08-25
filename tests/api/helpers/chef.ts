import type { APIRequestContext } from '@playwright/test'

/**
 * Shared helpers for chef-service tests (Phase 3).
 *
 * Every request goes through the gateway (baseURL = GATEWAY_URL in the
 * chef-via-gateway Playwright project). The signed access cookie set by
 * signup/signin is sent automatically by Playwright's cookie jar.
 *
 * Chef onboarding flow:
 *   1. signup as USER (sets USER access cookie)
 *   2. createChefProfile via POST /api/v1/chefs (USER can do this — only protectedProcedure)
 *   3. admin approves via PATCH /api/v1/chefs/:chefId/status (requires ADMIN token)
 *      → chef-service calls promoteUserToChef → auth-service changeRole (USER→CHEF)
 *   4. re-signin to get a fresh CHEF access token
 *   5. now create dishes/plans/schedules with the CHEF token
 */

const AUTH_TRPC = '/api/v1/auth/trpc'
const CHEF_BASE = '/api/v1/chefs'

export const STRONG_PASSWORD = 'ChefTest123!'

// Pre-seeded admin credentials (created at auth-service boot).
const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

export function uniqueEmail(prefix = 'chef'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

export interface ChefSession {
  email: string
  userId: string
  chefId: string
  role: string
}

/** POST a tRPC auth mutation (signup/signin) via the gateway. */
async function authPost(
  request: APIRequestContext,
  procedure: string,
  input: unknown,
): Promise<{ status: number; data: any; error: any }> {
  const res = await request.post(`${AUTH_TRPC}/${procedure}`, { data: input as Record<string, unknown> })
  const body = await res.json().catch(() => null)
  return { status: res.status(), data: body?.result?.data, error: body?.error }
}

/** POST JSON to a chef REST route via the gateway. */
export async function chefPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`${CHEF_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** PATCH JSON to a chef REST route via the gateway. */
export async function chefPatch(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.patch(`${CHEF_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** PUT JSON to a chef REST route via the gateway. */
export async function chefPut(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.put(`${CHEF_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** GET a chef REST route via the gateway. */
export async function chefGet(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await request.get(`${CHEF_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/**
 * Full chef onboarding: signup(USER) → createChefProfile → admin approve
 * (promotes to CHEF) → re-signin as CHEF. Returns session info including
 * chefId. The request context ends up authenticated as CHEF (cookie set).
 */
export async function setupActiveChef(
  request: APIRequestContext,
  email?: string,
): Promise<ChefSession> {
  const chefEmail = email ?? uniqueEmail()

  // 1. Signup as USER
  const signup = await authPost(request, 'signup', { email: chefEmail, password: STRONG_PASSWORD })
  if (signup.status !== 200 || !signup.data) {
    throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup)}`)
  }
  const userId = signup.data.userId

  // 2. Create chef profile (USER can do this — protectedProcedure)
  const createRes = await chefPost(request, '', {
    displayName: `Chef ${chefEmail.split('@')[0]}`,
    bio: 'Test chef',
    cuisineSpecialties: ['PAKISTANI'],
  })
  if (createRes.status !== 201) {
    throw new Error(`createChefProfile failed: ${createRes.status} ${JSON.stringify(createRes.data)}`)
  }
  const chefId = createRes.data._id

  // 3. Admin approves (need ADMIN token — switch context, approve, switch back)
  //    We use a separate admin context to avoid clobbering the chef's cookie.
  const { request: pw } = await import('@playwright/test')
  const adminCtx = await pw.newContext({ baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:3000' })
  try {
    const adminSignin = await authPost(adminCtx, 'signin', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    if (adminSignin.status !== 200) {
      throw new Error(`admin signin failed: ${adminSignin.status}`)
    }
    const approveRes = await chefPatch(adminCtx, `/${chefId}/status`, {
      verificationStatus: 'ACTIVE',
      accountState: 'ACTIVE',
    })
    if (approveRes.status !== 200) {
      throw new Error(`admin approve failed: ${approveRes.status} ${JSON.stringify(approveRes.data)}`)
    }
  } finally {
    await adminCtx.dispose()
  }

  // 4. Re-signin as CHEF (the promotion changed the user's role)
  const resignin = await authPost(request, 'signin', { email: chefEmail, password: STRONG_PASSWORD })
  if (resignin.status !== 200 || !resignin.data) {
    throw new Error(`chef re-signin failed: ${resignin.status} ${JSON.stringify(resignin)}`)
  }

  return { email: chefEmail, userId, chefId, role: resignin.data.role }
}
