# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\refresh.spec.ts >> tRPC refresh >> sets new access and refresh cookies after refresh
- Location: tests\auth\refresh.spec.ts:61:7

# Error details

```
Error: signup failed for refresh-cookies+1786287301390+dve6qyz17rp@chefmate.test: {"result":{"data":{"userId":"6a7894c5bcaf660c09e36652","email":"refresh-cookies+1786287301390+dve6qyz17rp@chefmate.test","role":"USER"}}}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: undefined
```

# Test source

```ts
  1   | /**
  2   |  * Auth fixtures for Playwright API tests.
  3   |  *
  4   |  * These helpers set up authenticated request contexts for tests.
  5   |  *
  6   |  * Cookie details:
  7   |  *   - auth-service sets signed HTTP-only cookies:
  8   |  *       access  (dev) / __Host-access (prod) — 15 min access token
  9   |  *       refresh (dev) / __Host-refresh (prod) — 7 day refresh token (path=/api/v1/auth/refresh)
  10  |  *   - Playwright's APIRequestContext maintains a cookie jar automatically.
  11  |  *   - Simply using the same `request` context after signin is enough for authenticated calls.
  12  |  */
  13  | import { test as base, expect } from '@playwright/test'
  14  | import type { APIRequestContext } from '@playwright/test'
  15  | import { trpcMutation, parseTRPC } from '../helpers/trpc'
  16  | 
  17  | export interface SignupResult {
  18  |   userId: string
  19  |   email: string
  20  |   role: string
  21  | }
  22  | 
  23  | export interface SigninResult {
  24  |   userId: string
  25  |   email: string
  26  |   role: string
  27  | }
  28  | 
  29  | /** Generate a unique test email to avoid conflicts between test runs. */
  30  | export function uniqueTestEmail(prefix = 'test'): string {
  31  |   return `${prefix}+${Date.now()}+${Math.random().toString(36).slice(2)}@chefmate.test`
  32  | }
  33  | 
  34  | /** The default strong test password that passes all ChefMate password rules. */
  35  | export const TEST_PASSWORD = process.env['TEST_USER_PASSWORD'] ?? 'TestPass123!'
  36  | 
  37  | /**
  38  |  * Sign up a new user directly via the auth-service tRPC endpoint.
  39  |  * Returns the signup result and the email used (for subsequent signin).
  40  |  */
  41  | export async function signupUser(
  42  |   request: APIRequestContext,
  43  |   email: string,
  44  |   password = TEST_PASSWORD,
  45  | ): Promise<SignupResult> {
  46  |   const res = await trpcMutation(request, 'signup', { email, password })
  47  |   const body = await parseTRPC<SignupResult>(res)
  48  |   expect(
  49  |     body.success,
  50  |     `signup failed for ${email}: ${JSON.stringify(body)}`,
> 51  |   ).toBe(true)
      |     ^ Error: signup failed for refresh-cookies+1786287301390+dve6qyz17rp@chefmate.test: {"result":{"data":{"userId":"6a7894c5bcaf660c09e36652","email":"refresh-cookies+1786287301390+dve6qyz17rp@chefmate.test","role":"USER"}}}
  52  |   return body.data as SignupResult
  53  | }
  54  | 
  55  | /**
  56  |  * Sign in an existing user.
  57  |  * The request context's cookie jar will hold the signed access + refresh cookies.
  58  |  */
  59  | export async function signinUser(
  60  |   request: APIRequestContext,
  61  |   email: string,
  62  |   password = TEST_PASSWORD,
  63  | ): Promise<SigninResult> {
  64  |   const res = await trpcMutation(request, 'signin', { email, password })
  65  |   const body = await parseTRPC<SigninResult>(res)
  66  |   expect(
  67  |     body.success,
  68  |     `signin failed for ${email}: ${JSON.stringify(body)}`,
  69  |   ).toBe(true)
  70  |   return body.data as SigninResult
  71  | }
  72  | 
  73  | /**
  74  |  * Sign up and immediately sign in a fresh test user.
  75  |  * After this call, `request` holds the auth cookies for the created user.
  76  |  */
  77  | export async function createAndSigninUser(
  78  |   request: APIRequestContext,
  79  |   emailPrefix = 'test',
  80  |   password = TEST_PASSWORD,
  81  | ): Promise<{ email: string; userId: string; role: string }> {
  82  |   const email = uniqueTestEmail(emailPrefix)
  83  |   await signupUser(request, email, password)
  84  |   const result = await signinUser(request, email, password)
  85  |   return { email, userId: result.userId, role: result.role }
  86  | }
  87  | 
  88  | /** Sign out the current user. */
  89  | export async function signoutUser(request: APIRequestContext): Promise<void> {
  90  |   await trpcMutation(request, 'signout')
  91  | }
  92  | 
  93  | /**
  94  |  * Extended test fixture that provides a pre-authenticated request context.
  95  |  *
  96  |  * Usage:
  97  |  *   test('does something authenticated', async ({ authedRequest, testUser }) => {
  98  |  *     // authedRequest already has the access cookie
  99  |  *   })
  100 |  */
  101 | export interface AuthFixtures {
  102 |   authedRequest: APIRequestContext
  103 |   testUser: { email: string; userId: string; role: string }
  104 | }
  105 | 
  106 | export const authTest = base.extend<AuthFixtures>({
  107 |   authedRequest: async ({ request }, use) => {
  108 |     await createAndSigninUser(request)
  109 |     await use(request)
  110 |   },
  111 |   testUser: async ({ request }, use) => {
  112 |     const user = await createAndSigninUser(request)
  113 |     await use(user)
  114 |   },
  115 | })
  116 | 
```