/**
 * Chef fixtures for Playwright API tests against chef-service.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { parseTRPC } from '../helpers/trpc'
export { parseTRPC } from '../helpers/trpc'
import { uniqueTestEmail, TEST_PASSWORD } from './auth'

export const CHEF_TRPC_BASE = '/trpc'
export const CHEF_REST_BASE = '/api/v1/chefs'

export interface AuthHeaders {
  'x-user-id':    string
  'x-user-role':  string
  'x-user-email': string
}

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

export async function createChefAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
  emailPrefix = 'chef-test',
): Promise<AuthHeaders> {
  const email = uniqueTestEmail(emailPrefix)

  const signupRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/signup`, {
    data: { email, password: TEST_PASSWORD },
  })
  const signupBody = await parseTRPC<{ userId: string; email: string; role: string }>(signupRes)

  if (signupBody.status !== 200 || !signupBody.data) {
    throw new Error(`Failed to signup test user: ${JSON.stringify(signupBody)}`)
  }

  const changeRoleRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/changeRole`, {
    data: { userId: signupBody.data.userId, newRole: 'CHEF' },
  })
  const changeRoleBody = await parseTRPC(changeRoleRes)

  if (changeRoleBody.status !== 200) {
    throw new Error(`Failed to change role to CHEF: ${JSON.stringify(changeRoleBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  'CHEF',
    'x-user-email': signupBody.data.email,
  }
}

export async function createAdminAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
): Promise<AuthHeaders> {
  const email = uniqueTestEmail('admin-test')

  const signupRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/signup`, {
    data: { email, password: TEST_PASSWORD },
  })
  const signupBody = await parseTRPC<{ userId: string; email: string; role: string }>(signupRes)

  if (signupBody.status !== 200 || !signupBody.data) {
    throw new Error(`Failed to signup admin test user: ${JSON.stringify(signupBody)}`)
  }

  const changeRoleRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/changeRole`, {
    data: { userId: signupBody.data.userId, newRole: 'ADMIN' },
  })
  const changeRoleBody = await parseTRPC(changeRoleRes)

  if (changeRoleBody.status !== 200) {
    throw new Error(`Failed to change role to ADMIN: ${JSON.stringify(changeRoleBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  'ADMIN',
    'x-user-email': signupBody.data.email,
  }
}

export function fakeUserAuthHeaders(userId = `user-${Date.now()}`): AuthHeaders {
  return {
    'x-user-id':    userId,
    'x-user-role':  'USER',
    'x-user-email': `${userId}@chefmate.test`,
  }
}
