import { expect } from '@playwright/test'
import type { APIResponse } from '@playwright/test'
import type { TRPCFlatResponse } from './trpc'

/**
 * Assert a tRPC response is a success.
 * Checks status === expectedHttpStatus and that data is present.
 */
export function assertTRPCSuccess<T>(
  body: TRPCFlatResponse<T>,
  httpStatus = 200,
): asserts body is TRPCFlatResponse<T> & { status: number; data: T } {
  expect(body.status, `Expected status=${httpStatus}, got: ${JSON.stringify(body)}`).toBe(httpStatus)
  expect(body.message, `Success response should not have a message: ${JSON.stringify(body)}`).toBeUndefined()
}

/**
 * Assert a tRPC response is a failure with the expected status code.
 */
export function assertTRPCError(
  body: TRPCFlatResponse,
  expectedStatus: number,
): void {
  expect(body.status, `Expected status=${expectedStatus}, got: ${JSON.stringify(body)}`).toBe(expectedStatus)
  expect(body.message, `Error response should have a message: ${JSON.stringify(body)}`).toBeDefined()
  expect(body.data, `Error response should not have a data field: ${JSON.stringify(body)}`).toBeUndefined()
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
 */
export function assertCookieSet(response: APIResponse, cookieName: string): string {
  const setCookieHeader = response.headers()['set-cookie'] ?? ''
  expect(
    setCookieHeader,
    `Expected Set-Cookie header containing "${cookieName}"`,
  ).toContain(cookieName)
  return setCookieHeader
}
