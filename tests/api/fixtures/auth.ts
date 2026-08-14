/**
 * Auth fixtures for Playwright API tests.
 */
import { test as base, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../helpers/trpc'

export interface SignupResult {
  userId: string
  email: string
  role: string
}

export interface SigninResult {
  userId: string
  email: string
  role: string
}

export function uniqueTestEmail(prefix = 'test'): string {
  return `${prefix}+${Date.now()}+${Math.random().toString(36).slice(2)}@chefmate.test`
}

export const TEST_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? 'TestPass123!'

export async function signupUser(
  request: APIRequestContext,
  email: string,
  password = TEST_PASSWORD,
): Promise<SignupResult> {
  const res = await trpcMutation(request, 'signup', { email, password })
  const body = await parseTRPC<SignupResult>(res)
  expect(
    body.status,
    `signup failed for ${email}: ${JSON.stringify(body)}`,
  ).toBe(200)
  return body.data as SignupResult
}

export async function signinUser(
  request: APIRequestContext,
  email: string,
  password = TEST_PASSWORD,
): Promise<SigninResult> {
  const res = await trpcMutation(request, 'signin', { email, password })
  const body = await parseTRPC<SigninResult>(res)
  expect(
    body.status,
    `signin failed for ${email}: ${JSON.stringify(body)}`,
  ).toBe(200)
  return body.data as SigninResult
}

export async function createAndSigninUser(
  request: APIRequestContext,
  emailPrefix = 'test',
  password = TEST_PASSWORD,
): Promise<{ email: string; userId: string; role: string }> {
  const email = uniqueTestEmail(emailPrefix)
  await signupUser(request, email, password)
  const result = await signinUser(request, email, password)
  return { email, userId: result.userId, role: result.role }
}

export async function signoutUser(request: APIRequestContext): Promise<void> {
  await trpcMutation(request, 'signout')
}

export interface AuthFixtures {
  authedRequest: APIRequestContext
  testUser: { email: string; userId: string; role: string }
}

export const authTest = base.extend<AuthFixtures>({
  authedRequest: async ({ request }, use) => {
    await createAndSigninUser(request)
    await use(request)
  },
  testUser: async ({ request }, use) => {
    const user = await createAndSigninUser(request)
    await use(user)
  },
})
