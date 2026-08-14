/**
 * User fixtures for Playwright API tests against user-service.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../helpers/trpc'
import { uniqueTestEmail, TEST_PASSWORD } from './auth'

export const USER_TRPC_BASE = '/trpc'

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

export interface AuthHeaders {
  'x-user-id': string
  'x-user-role': string
  'x-user-email': string
}

export async function createAuthHeaders(
  request: APIRequestContext,
  authServiceUrl: string,
  emailPrefix = 'user-test',
): Promise<AuthHeaders> {
  const email = uniqueTestEmail(emailPrefix)

  const signupRes = await request.post(`${authServiceUrl}/api/v1/auth/trpc/signup`, {
    data: { email, password: TEST_PASSWORD },
  })
  const signupBody = await parseTRPC<{ userId: string; email: string; role: string }>(signupRes)

  if (signupBody.status !== 200 || !signupBody.data) {
    throw new Error(`Failed to signup test user: ${JSON.stringify(signupBody)}`)
  }

  return {
    'x-user-id':    signupBody.data.userId,
    'x-user-role':  signupBody.data.role,
    'x-user-email': signupBody.data.email,
  }
}

export function fakeAuthHeaders(userId = 'test-user-id-' + Date.now()): AuthHeaders {
  return {
    'x-user-id':    userId,
    'x-user-role':  'USER',
    'x-user-email': `${userId}@chefmate.test`,
  }
}

export async function createProfileViaUpdateMe(
  request: APIRequestContext,
  authHeaders: AuthHeaders,
  data: { firstName: string; lastName: string },
): Promise<void> {
  await userTrpcMutation(request, 'updateMe', data, authHeaders)
}
