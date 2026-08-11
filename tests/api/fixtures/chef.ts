/**
 * Chef fixtures for Playwright API tests against chef-service.
 *
 * Chef-service reads X-User-Id, X-User-Role, X-User-Email headers injected
 * by the gateway. In direct tests (bypassing gateway) we simulate this by
 * passing the headers manually.
 *
 * Test flow:
 *   1. Sign up via auth-service to get a real userId
 *   2. Change role to CHEF via changeRole (internal procedure)
 *   3. Pass X-User-* headers directly to chef-service requests
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { parseTRPC } from '../helpers/trpc'
export { parseTRPC } from '../helpers/trpc'
import { uniqueTestEmail, TEST_PASSWORD } from './auth'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHEF_TRPC_BASE = '/trpc'
export const CHEF_REST_BASE = '/api/v1/chefs'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AuthHeaders {
  'x-user-id':    string
  'x-user-role':  string
  'x-user-email': string
}

// ─── tRPC helpers ─────────────────────────────────────────────────────────────

/** Send a tRPC mutation (POST) to chef-service. */
export async function chefTrpcMutation(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  headers?: Record<string, string>,
): Promise<APIResponse> {
  return request.post(`${CHEF_TRPC_BASE}/${procedure}`, {
    data: input ?? {},
    headers,
  })
}

/** Send a tRPC query (GET) to chef-service. */
export async function chefTrpcQuery(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  headers?: Record<string, string>,
): Promise<APIResponse> {
  const params: Record<string, string> = {}
  if (input !== undefined) {
    params['input'] = JSON.stringify(input)
  }
  return request.get(`${CHEF_TRPC_BASE}/${procedure}`, {
    params,
    headers,
  })
}

// ─── Auth header helpers ──────────────────────────────────────────────────────

/**
 * Signs up a new user via the auth-service, then returns X-User-* headers
 * with role='CHEF'. Used to simulate a CHEF identity in direct chef-service tests.
 */
export async function createChefAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
  emailPrefix = 'chef-test',
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

  // Change role to CHEF (direct auth-service call)
  const changeRoleRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/changeRole`, {
    data: { userId: signupBody.data.userId, newRole: 'CHEF' },
  })
  const changeRoleBody = await parseTRPC(changeRoleRes)

  if (!changeRoleBody.success) {
    throw new Error(`Failed to change role to CHEF: ${JSON.stringify(changeRoleBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  'CHEF',
    'x-user-email': signupBody.data.email,
  }
}

/**
 * Creates an ADMIN auth header set. Admin users are typically promoted via changeRole.
 */
export async function createAdminAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
): Promise<AuthHeaders> {
  const email = uniqueTestEmail('admin-test')

  const signupRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/signup`, {
    data: { email, password: TEST_PASSWORD },
  })
  const signupBody = await parseTRPC<{ userId: string; email: string; role: string }>(signupRes)

  if (!signupBody.success || !signupBody.data) {
    throw new Error(`Failed to signup admin test user: ${JSON.stringify(signupBody)}`)
  }

  const changeRoleRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/changeRole`, {
    data: { userId: signupBody.data.userId, newRole: 'ADMIN' },
  })
  const changeRoleBody = await parseTRPC(changeRoleRes)

  if (!changeRoleBody.success) {
    throw new Error(`Failed to change role to ADMIN: ${JSON.stringify(changeRoleBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  'ADMIN',
    'x-user-email': signupBody.data.email,
  }
}

/**
 * Creates a fake USER auth header set (no real auth-service call needed).
 */
export function fakeUserAuthHeaders(userId = `user-${Date.now()}`): AuthHeaders {
  return {
    'x-user-id':    userId,
    'x-user-role':  'USER',
    'x-user-email': `${userId}@chefmate.test`,
  }
}
