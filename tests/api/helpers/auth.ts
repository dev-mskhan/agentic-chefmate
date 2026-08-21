import type { APIRequestContext } from '@playwright/test'

/**
 * Shared helpers for auth tests.
 *
 * Every request goes through the gateway (baseURL is GATEWAY_URL in the
 * auth-via-gateway Playwright project), except the internal changeRole call
 * which bypasses the gateway because it is an internal service-to-service
 * procedure that the gateway strips x-internal-secret from.
 */

export const TRPC_PREFIX = '/api/v1/auth/trpc'

// Same value as services/admin-service/.env INTERNAL_SECRET — used by
// admin-service to call auth-service's internal changeRole procedure.
export const INTERNAL_SECRET =
  process.env['INTERNAL_SECRET'] ?? 'dev-internal-secret-32-characters!!'

export const AUTH_SERVICE_URL =
  process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

export function uniqueEmail(prefix = 'auth'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

export const STRONG_PASSWORD = 'AuthTest123!'

export interface AuthSession {
  email: string
  userId: string
  role: string
}

/**
 * POST a tRPC mutation.
 *
 * Wire format (raw tRPC, as served through the gateway):
 *   success → { result: { data: <payload> } }
 *   error   → { error: { message, data: { httpStatus, errors? } } }
 *
 * We surface both shapes plus the HTTP status so tests can assert either.
 */
export async function trpcPost(
  request: APIRequestContext,
  procedure: string,
  input: unknown,
  extra?: { headers?: Record<string, string> },
): Promise<{ status: number; body: any; data: any; error: any }> {
  const res = await request.post(`${TRPC_PREFIX}/${procedure}`, {
    data: input as Record<string, unknown>,
    headers: extra?.headers,
  })
  const body = await res.json().catch(() => null)
  return {
    status: res.status(),
    body,
    data: body?.result?.data,
    error: body?.error,
  }
}

/** GET a tRPC query (no input). */
export async function trpcGet(
  request: APIRequestContext,
  procedure: string,
  extra?: { headers?: Record<string, string> },
): Promise<{ status: number; body: any; data: any; error: any }> {
  const res = await request.get(`${TRPC_PREFIX}/${procedure}`, {
    headers: extra?.headers,
  })
  const body = await res.json().catch(() => null)
  return {
    status: res.status(),
    body,
    data: body?.result?.data,
    error: body?.error,
  }
}

/** Extract the effective HTTP status from a tRPC error body. */
export function errorHttpStatus(error: any): number {
  return error?.data?.httpStatus ?? 500
}

/** Extract the message from a tRPC error body. */
export function errorMessage(error: any): string {
  return error?.message ?? ''
}

/**
 * Sign up via the gateway and return the session info.
 * The signed access + refresh cookies are stored on the request context
 * (APIRequestContext persists cookies across calls automatically).
 */
export async function signup(
  request: APIRequestContext,
  email: string,
  password: string = STRONG_PASSWORD,
): Promise<AuthSession> {
  const { status, data, body } = await trpcPost(request, 'signup', { email, password })
  if (status !== 200 || !data) {
    throw new Error(`signup failed: ${status} ${JSON.stringify(body)}`)
  }
  return {
    email,
    userId: data.userId,
    role: data.role,
  }
}

/** Sign in via the gateway. */
export async function signin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ status: number; data: any; error: any; body: any }> {
  return trpcPost(request, 'signin', { email, password })
}

/**
 * Call the auth-service internal changeRole procedure directly (bypassing
 * the gateway, which strips x-internal-secret). This mirrors how an
 * internal caller would invoke the procedure.
 *
 * The auth-service tRPC router is mounted at /api/v1/auth/trpc, so the
 * changeRole procedure lives at /api/v1/auth/trpc/changeRole. A single
 * tRPC mutation accepts the raw input object as the JSON body (same shape
 * the public auth tests use for signup/signin).
 */
export async function changeRoleDirect(
  request: APIRequestContext,
  userId: string,
  newRole: 'USER' | 'CHEF' | 'ADMIN',
): Promise<{ status: number; body: any }> {
  const url = `${AUTH_SERVICE_URL}/api/v1/auth/trpc/changeRole`
  const res = await request.post(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    data: { userId, newRole },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}
