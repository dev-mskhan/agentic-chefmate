/**
 * tRPC HTTP helpers for Playwright API testing.
 *
 * ChefMate uses @trpc/server with fastify-trpc-plugin.
 *
 * tRPC HTTP routing:
 *   - Queries   → GET  /<prefix>/<procedure>?input=<json-encoded-input>
 *   - Mutations → POST /<prefix>/<procedure>  body: <input>
 *
 * ChefMate's onSend hook transforms tRPC responses to:
 *   Success: { status: 200, data: <payload> }
 *   Error:   { status: 4xx, message: "...", errors?: [...] }
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
 * The standard ChefMate tRPC HTTP response envelope.
 *
 * Success: { status: 200, data: T }
 * Error:   { status: 4xx|5xx, message: string, errors?: [...] }
 */
export interface TRPCFlatResponse<T = unknown> {
  status: number
  data?: T
  message?: string
  errors?: Array<{ path: string; message: string }>
}

export async function parseTRPC<T = unknown>(
  response: APIResponse,
): Promise<TRPCFlatResponse<T>> {
  return response.json() as Promise<TRPCFlatResponse<T>>
}
