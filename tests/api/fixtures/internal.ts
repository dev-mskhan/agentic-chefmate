/**
 * Internal procedure fixture for testing procedures that require internal access.
 *
 * changeRole uses internalProcedure which currently has NO middleware guard
 * (protection is solely via gateway stripping x-internal-secret).
 * Tests call auth-service directly, bypassing the gateway.
 *
 * When a secret guard is added to internalProcedure in the future,
 * set INTERNAL_SECRET in .env.test and this fixture will inject it.
 */
import type { APIRequestContext } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../helpers/trpc'
import type { TRPCFlatResponse } from '../helpers/trpc'

const INTERNAL_SECRET = process.env['INTERNAL_SECRET'] ?? ''

/** Build extra headers for internal procedure calls. */
export function internalHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (INTERNAL_SECRET) {
    headers['x-internal-secret'] = INTERNAL_SECRET
  }
  return headers
}

export interface ChangeRoleResult {
  userId: string
  oldRole: string
  newRole: string
}

/**
 * Call the changeRole tRPC mutation directly on auth-service.
 * Must be called with an auth-service-pointing request context.
 */
export async function changeRole(
  request: APIRequestContext,
  userId: string,
  newRole: 'USER' | 'CHEF' | 'ADMIN',
): Promise<TRPCFlatResponse<ChangeRoleResult>> {
  const res = await trpcMutation(
    request,
    'changeRole',
    { userId, newRole },
    { headers: internalHeaders() },
  )
  return parseTRPC<ChangeRoleResult>(res)
}
