/**
 * tRPC HTTP helpers for Playwright API testing.
 *
 * ChefMate uses @trpc/server with fastify-trpc-plugin.
 * All tRPC procedures are served under /api/v1/auth/trpc/<procedure>.
 *
 * tRPC HTTP routing:
 *   - Queries  → GET  /api/v1/auth/trpc/<procedure>?input=<json-encoded-input>
 *   - Mutations → POST /api/v1/auth/trpc/<procedure>  body: <input>
 *
 * ChefMate adds an onSend hook that flattens the tRPC envelope:
 *   Success: { success: true,  statusCode: 200, message: "Success", data: <payload> }
 *   Error:   { success: false, statusCode: 4xx, message: "...",     errors?: [...] }
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'

export const TRPC_BASE = '/api/v1/auth/trpc'

/** Send a tRPC mutation (POST). */
export async function trpcMutation(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<APIResponse> {
  return request.post(`${TRPC_BASE}/${procedure}`, {
    data: input ?? {},
    headers: options?.headers,
  })
}

/** Send a tRPC query (GET). */
export async function trpcQuery(
  request: APIRequestContext,
  procedure: string,
  input?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<APIResponse> {
  const params: Record<string, string> = {}
  if (input !== undefined) {
    params['input'] = JSON.stringify(input)
  }
  return request.get(`${TRPC_BASE}/${procedure}`, {
    params,
    headers: options?.headers,
  })
}

/**
 * Parse and return the flattened response body.
 * ChefMate's onSend hook always returns this shape for tRPC routes.
 */
export interface TRPCFlatResponse<T = unknown> {
  success: boolean
  statusCode: number
  message: string
  data?: T
  errors?: Array<{ path: string; message: string }>
}

export async function parseTRPC<T = unknown>(
  response: APIResponse,
): Promise<TRPCFlatResponse<T>> {
  return response.json() as Promise<TRPCFlatResponse<T>>
}
