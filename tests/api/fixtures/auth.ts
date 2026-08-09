/**
 * Auth fixtures for Playwright API tests.
 *
 * These helpers set up authenticated request contexts for tests.
 *
 * Cookie details:
 *   - auth-service sets signed HTTP-only cookies:
 *       access  (dev) / __Host-access (prod) — 15 min access token
 *       refresh (dev) / __Host-refresh (prod) — 7 day refresh token (path=/api/v1/auth/refresh)
 *   - Playwright's APIRequestContext maintains a cookie jar automatically.
 *   - Simply using the same `request` context after signin is enough for authenticated calls.
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

/** Generate a unique test email to avoid conflicts between test runs. */
export function uniqueTestEmail(prefix = 'test'): string {
  return `${prefix}+${Date.now()}+${Math.random().toString(36).slice(2)}@chefmate.test`
}

/** The default strong test password that passes all ChefMate password rules. */
export const TEST_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? 'TestPass123!'

/**
 * Sign up a new user directly via the auth-service tRPC endpoint.
 * Returns the signup result and the email used (for subsequent signin).
 */
export async function signupUser(
  request: APIRequestContext,
  email: string,
  password = TEST_PASSWORD,
): Promise<SignupResult> {
  const res = await trpcMutation(request, 'signup', { email, password })
  const body = await parseTRPC<SignupResult>(res)
  expect(
    body.success,
    `signup failed for ${email}: ${JSON.stringify(body)}`,
  ).toBe(true)
  return body.data as SignupResult
}

/**
 * Sign in an existing user.
 * The request context's cookie jar will hold the signed access + refresh cookies.
 */
export async function signinUser(
  request: APIRequestContext,
  email: string,
  password = TEST_PASSWORD,
): Promise<SigninResult> {
  const res = await trpcMutation(request, 'signin', { email, password })
  const body = await parseTRPC<SigninResult>(res)
  expect(
    body.success,
    `signin failed for ${email}: ${JSON.stringify(body)}`,
  ).toBe(true)
  return body.data as SigninResult
}

/**
 * Sign up and immediately sign in a fresh test user.
 * After this call, `request` holds the auth cookies for the created user.
 */
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

/** Sign out the current user. */
export async function signoutUser(request: APIRequestContext): Promise<void> {
  await trpcMutation(request, 'signout')
}

/**
 * Extended test fixture that provides a pre-authenticated request context.
 *
 * Usage:
 *   test('does something authenticated', async ({ authedRequest, testUser }) => {
 *     // authedRequest already has the access cookie
 *   })
 */
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
