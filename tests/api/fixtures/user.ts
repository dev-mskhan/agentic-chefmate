/**
 * User fixtures for Playwright API tests against user-service.
 *
 * User-service reads X-User-Id, X-User-Role, X-User-Email headers injected
 * by the gateway. In direct tests (bypassing gateway) we simulate this by
 * passing the headers manually.
 *
 * Test flow:
 *   1. Sign up via auth-service to get a real userId
 *   2. Pass X-User-* headers directly to user-service requests
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../helpers/trpc'
import { uniqueTestEmail, TEST_PASSWORD } from './auth'

// ─── Constants ────────────────────────────────────────────────────────────────

export const USER_TRPC_BASE = '/trpc'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Send a tRPC mutation (POST) to user-service. */
export async function userTrpcMutation(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  headers?: Record<string, string>,
): Promise<APIResponse> {
  return request.post(`${USER_TRPC_BASE}/${procedure}`, {
    data: input ?? {},
    headers,
  })
}

/** Send a tRPC query (GET) to user-service. */
export async function userTrpcQuery(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  headers?: Record<string, string>,
): Promise<APIResponse> {
  const params: Record<string, string> = {}
  if (input !== undefined) {
    params['input'] = JSON.stringify(input)
  }
  return request.get(`${USER_TRPC_BASE}/${procedure}`, {
    params,
    headers,
  })
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface AuthHeaders {
  'x-user-id': string
  'x-user-role': string
  'x-user-email': string
}

/**
 * Signs up a new user via the auth-service (using AUTH_SERVICE_URL from env),
 * then returns the X-User-* headers that the gateway would inject.
 *
 * NOTE: This requires AUTH_SERVICE_URL to be reachable. The returned headers
 * can be passed directly to user-service tRPC calls.
 */
export async function createAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
  emailPrefix = 'user-test',
): Promise<AuthHeaders> {
  const email = uniqueTestEmail(emailPrefix)

  // Sign up via auth-service
  const signupRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/signup`, {
    data: { email, password: TEST_PASSWORD },
  })
  const signupBody = await parseTRPC<{ userId: string; email: string; role: string }>(signupRes)

  if (!signupBody.success || !signupBody.data) {
    throw new Error(`Failed to signup test user: ${JSON.stringify(signupBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  signupBody.data.role,
    'x-user-email': signupBody.data.email,
  }
}

/**
 * Creates a deterministic set of auth headers using a fixed userId.
 * Useful for tests that don't need a real auth-service signup
 * (e.g. when testing 404 on missing profile).
 */
export function fakeAuthHeaders(userId = 'test-user-id-' + Date.now()): AuthHeaders {
  return {
    'x-user-id':    userId,
    'x-user-role':  'USER',
    'x-user-email': `${userId}@chefmate.test`,
  }
}

/**
 * Helper that creates a real user via auth-service, then calls updateMe with
 * firstName + lastName to initialise the profile (upsert:true in updateMe).
 */
export async function createProfileViaUpdateMe(
  request: APIRequestContext,
  authHeaders: AuthHeaders,
  data: { firstName: string; lastName: string },
): Promise<void> {
  await userTrpcMutation(request, 'updateMe', data, authHeaders)
}
