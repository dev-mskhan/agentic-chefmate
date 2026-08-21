import type { APIRequestContext } from '@playwright/test'

/**
 * Shared helpers for user-service tests (Phase 2).
 *
 * Every request goes through the gateway:
 *   - signup → POST /api/v1/auth/trpc/signup  (sets signed access cookie on the request context)
 *   - user tRPC → POST/GET /api/v1/users/trpc/{procedure}  (cookie sent automatically;
 *     gateway auth-verify injects x-user-id / x-user-role / x-user-email headers)
 *
 * Wire format is raw tRPC:
 *   success → { result: { data: <payload> } }
 *   error   → { error: { message, data: { httpStatus, errors? } } }
 */

const AUTH_TRPC = '/api/v1/auth/trpc'
const USER_TRPC = '/api/v1/users/trpc'

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

export const STRONG_PASSWORD = 'UserTest123!'

export interface UserSession {
  email: string
  userId: string
  role: string
}

/**
 * Sign up via the gateway. The signed access cookie is stored on the
 * APIRequestContext and sent automatically on subsequent same-site requests,
 * so user-service calls through /api/v1/users/* are authenticated.
 *
 * Also waits briefly for the user-service Kafka consumer to create the
 * stub UserProfile (firstName:'New', lastName:'User') from the
 * user.registered event. If the profile isn't ready yet, updateMe upserts it.
 */
export async function signupViaGateway(
  request: APIRequestContext,
  email: string = uniqueEmail(),
  password: string = STRONG_PASSWORD,
): Promise<UserSession> {
  const res = await request.post(`${AUTH_TRPC}/signup`, { data: { email, password } })
  const body = await res.json().catch(() => null)
  if (res.status() !== 200 || !body?.result?.data) {
    throw new Error(`signup failed: ${res.status()} ${JSON.stringify(body)}`)
  }
  return {
    email,
    userId: body.result.data.userId,
    role: body.result.data.role,
  }
}

/**
 * Ensure a UserProfile exists for the session. The Kafka consumer normally
 * creates one, but it's async; updateMe upserts so we get a guaranteed-valid
 * profile we can immediately read back.
 */
export async function ensureProfile(
  request: APIRequestContext,
  firstName = 'Test',
  lastName = 'User',
): Promise<void> {
  const res = await request.post(`${USER_TRPC}/updateMe`, {
    data: { firstName, lastName },
  })
  if (res.status() !== 200) {
    throw new Error(`ensureProfile/updateMe failed: ${res.status()} ${await res.text().catch(() => '')}`)
  }
}

/** Full setup: signup + ensure profile. Returns the session. */
export async function setupUser(
  request: APIRequestContext,
  email?: string,
): Promise<UserSession> {
  const session = await signupViaGateway(request, email)
  await ensureProfile(request)
  return session
}

export interface TrpcResult {
  status: number
  body: any
  data: any
  error: any
}

/** POST a user-service tRPC mutation. */
export async function utrpcPost(
  request: APIRequestContext,
  procedure: string,
  input: unknown,
): Promise<TrpcResult> {
  const res = await request.post(`${USER_TRPC}/${procedure}`, {
    data: input as Record<string, unknown>,
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body, data: body?.result?.data, error: body?.error ?? body }
}

/** GET a user-service tRPC query (no input). */
export async function utrpcGet(
  request: APIRequestContext,
  procedure: string,
): Promise<TrpcResult> {
  const res = await request.get(`${USER_TRPC}/${procedure}`)
  const body = await res.json().catch(() => null)
  return { status: res.status(), body, data: body?.result?.data, error: body?.error ?? body }
}

/** GET a user-service tRPC query with input encoded in the query string. */
export async function utrpcGetWithInput(
  request: APIRequestContext,
  procedure: string,
  input: Record<string, unknown>,
): Promise<TrpcResult> {
  const res = await request.get(`${USER_TRPC}/${procedure}`, { params: { input: JSON.stringify(input) } })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body, data: body?.result?.data, error: body?.error ?? body }
}

/**
 * Extract the effective HTTP status from an error body.
 * Handles both the tRPC error shape ({ error: { data: { httpStatus } } })
 * and the gateway's non-tRPC error envelope ({ statusCode, message })
 * produced by the auth-verify hook when it rejects before proxying.
 * Falls back to the provided HTTP status (from the response) when neither
 * shape carries a status.
 */
export function errorHttpStatus(error: any, fallbackStatus?: number): number {
  if (error?.data?.httpStatus) return error.data.httpStatus
  if (typeof error?.statusCode === 'number') return error.statusCode
  return fallbackStatus ?? 500
}

/** Extract the message from an error body (tRPC or gateway envelope). */
export function errorMessage(error: any): string {
  return error?.message ?? ''
}
