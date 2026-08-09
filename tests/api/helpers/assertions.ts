import { expect } from '@playwright/test'
import type { APIResponse } from '@playwright/test'
import type { TRPCFlatResponse } from './trpc'

/** Assert a tRPC response is a success with the expected HTTP status. */
export function assertTRPCSuccess<T>(
  body: TRPCFlatResponse<T>,
  httpStatus = 200,
): asserts body is TRPCFlatResponse<T> & { success: true; data: T } {
  expect(body.success, `Expected success=true, got: ${JSON.stringify(body)}`).toBe(true)
  expect(body.statusCode).toBe(httpStatus)
}

/** Assert a tRPC response is a failure with the expected status code. */
export function assertTRPCError(
  body: TRPCFlatResponse,
  expectedStatus: number,
): void {
  expect(body.success, `Expected success=false, got: ${JSON.stringify(body)}`).toBe(false)
  expect(body.statusCode).toBe(expectedStatus)
}

/** Assert a REST response has the given status and return its JSON body. */
export async function assertStatus<T = unknown>(
  response: APIResponse,
  expectedStatus: number,
): Promise<T> {
  const body = await response.json() as T
  expect(
    response.status(),
    `Expected HTTP ${expectedStatus}, got ${response.status()}.\nBody: ${JSON.stringify(body)}`,
  ).toBe(expectedStatus)
  return body
}

/**
 * Assert a Set-Cookie header is present and return the cookie string.
 * Playwright's cookie jar handles these automatically, but this is
 * useful to verify cookies are actually being set.
 */
export function assertCookieSet(response: APIResponse, cookieName: string): string {
  const setCookieHeader = response.headers()['set-cookie'] ?? ''
  expect(
    setCookieHeader,
    `Expected Set-Cookie header containing "${cookieName}"`,
  ).toContain(cookieName)
  return setCookieHeader
}
