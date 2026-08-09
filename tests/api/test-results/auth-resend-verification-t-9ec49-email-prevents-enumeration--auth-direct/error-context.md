# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\resend-verification.spec.ts >> tRPC resendVerification >> returns success even for non-existent email (prevents enumeration)
- Location: tests\auth\resend-verification.spec.ts:26:7

# Error details

```
Error: Expected success=true, got: {"result":{"data":{"success":true}}}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: undefined
```

# Test source

```ts
  1  | import { expect } from '@playwright/test'
  2  | import type { APIResponse } from '@playwright/test'
  3  | import type { TRPCFlatResponse } from './trpc'
  4  | 
  5  | /** Assert a tRPC response is a success with the expected HTTP status. */
  6  | export function assertTRPCSuccess<T>(
  7  |   body: TRPCFlatResponse<T>,
  8  |   httpStatus = 200,
  9  | ): asserts body is TRPCFlatResponse<T> & { success: true; data: T } {
> 10 |   expect(body.success, `Expected success=true, got: ${JSON.stringify(body)}`).toBe(true)
     |                                                                               ^ Error: Expected success=true, got: {"result":{"data":{"success":true}}}
  11 |   expect(body.statusCode).toBe(httpStatus)
  12 | }
  13 | 
  14 | /** Assert a tRPC response is a failure with the expected status code. */
  15 | export function assertTRPCError(
  16 |   body: TRPCFlatResponse,
  17 |   expectedStatus: number,
  18 | ): void {
  19 |   expect(body.success, `Expected success=false, got: ${JSON.stringify(body)}`).toBe(false)
  20 |   expect(body.statusCode).toBe(expectedStatus)
  21 | }
  22 | 
  23 | /** Assert a REST response has the given status and return its JSON body. */
  24 | export async function assertStatus<T = unknown>(
  25 |   response: APIResponse,
  26 |   expectedStatus: number,
  27 | ): Promise<T> {
  28 |   const body = await response.json() as T
  29 |   expect(
  30 |     response.status(),
  31 |     `Expected HTTP ${expectedStatus}, got ${response.status()}.\nBody: ${JSON.stringify(body)}`,
  32 |   ).toBe(expectedStatus)
  33 |   return body
  34 | }
  35 | 
  36 | /**
  37 |  * Assert a Set-Cookie header is present and return the cookie string.
  38 |  * Playwright's cookie jar handles these automatically, but this is
  39 |  * useful to verify cookies are actually being set.
  40 |  */
  41 | export function assertCookieSet(response: APIResponse, cookieName: string): string {
  42 |   const setCookieHeader = response.headers()['set-cookie'] ?? ''
  43 |   expect(
  44 |     setCookieHeader,
  45 |     `Expected Set-Cookie header containing "${cookieName}"`,
  46 |   ).toContain(cookieName)
  47 |   return setCookieHeader
  48 | }
  49 | 
```