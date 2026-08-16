/**
 * Cross-service client for Chef Service.
 *
 * The Order Service never owns chef or dish data. It calls Chef Service's
 * existing HTTP endpoints (REST over the Fastify routes) to:
 *  1. Verify the chef is active and eligible to receive orders.
 *  2. Fetch dish details to build the immutable order item snapshots.
 *  3. Check chef availability / capacity for the requested delivery date.
 *
 * All calls are direct HTTP (fetch). The gateway is bypassed — these are
 * internal service-to-service calls using the CHEF_SERVICE_URL config.
 *
 * No auth headers are required because chef-service's public/protected
 * procedures do not reject unauthenticated requests for reads; the gateway
 * principal-injection is only needed for mutations.
 *
 * We pass a synthetic X-User-Id / X-User-Role / X-User-Email so the
 * chef-service context can still extract a principal for ownership checks
 * that don't apply to read-only calls.
 */

import { config } from '../config'
import { NotFoundError, ValidationError, ForbiddenError } from '@chefmate/errors'

export interface ChefValidationResult {
  chefId:     string
  userId:     string
  isEligible: boolean
  reason?:    string
}

export interface DishSnapshot {
  dishId:      string
  name:        string
  description?: string
  price:       number
  currency:    string
  dietaryTags: string[]
  allergens:   string[]
  status:      string
  chefId:      string
}

/** System headers used for internal service-to-service calls. */
function internalHeaders(): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'X-User-Id':     'system',
    'X-User-Role':   'ADMIN',
    'X-User-Email':  'system@chefmate.internal',
  }
}

/**
 * Fetches chef profile + status and determines if the chef can accept orders.
 * Returns { isEligible: true } or { isEligible: false, reason }.
 */
export async function validateChef(chefId: string): Promise<ChefValidationResult> {
  const base = config.CHEF_SERVICE_URL

  // Fetch status via the existing REST route
  const statusRes = await fetch(`${base}/api/v1/chefs/${chefId}/status`, {
    headers: internalHeaders(),
  })

  if (statusRes.status === 404) {
    throw new NotFoundError(`Chef ${chefId} not found`)
  }
  if (!statusRes.ok) {
    throw new ValidationError(`Failed to fetch chef status: ${statusRes.status}`)
  }

  const body = await statusRes.json() as {
    statusCode?: number
    data?: { verificationStatus: string; accountState: string; chefId: string }
    verificationStatus?: string
    accountState?: string
  }

  // Support both raw and wrapped response format
  const data = body.data ?? body as { verificationStatus: string; accountState: string; chefId: string }

  if (data.verificationStatus !== 'ACTIVE') {
    return { chefId, userId: '', isEligible: false, reason: 'Chef is not verified' }
  }
  if (data.accountState !== 'ACTIVE') {
    return { chefId, userId: '', isEligible: false, reason: 'Chef account is not active' }
  }

  return { chefId, userId: '', isEligible: true }
}

/**
 * Fetches a single dish by chefId + dishId and returns a snapshot.
 * Throws NotFoundError if the dish does not exist or does not belong to the chef.
 * Throws ValidationError if the dish is not ACTIVE.
 */
export async function fetchDishSnapshot(chefId: string, dishId: string): Promise<DishSnapshot> {
  const base = config.CHEF_SERVICE_URL

  const res = await fetch(`${base}/api/v1/chefs/${chefId}/dishes/${dishId}`, {
    headers: internalHeaders(),
  })

  if (res.status === 404) {
    throw new NotFoundError(`Dish ${dishId} not found for chef ${chefId}`)
  }
  if (!res.ok) {
    throw new ValidationError(`Failed to fetch dish: ${res.status}`)
  }

  const body = await res.json() as {
    statusCode?: number
    data?: Record<string, unknown>
    [key: string]: unknown
  }

  const raw = (body.data ?? body) as {
    _id?: string; dishId?: string; chefId: string; name: string
    description?: string; price: number; currency: string
    dietaryTags?: string[]; allergens?: string[]; status: string
  }

  if (raw.status !== 'ACTIVE') {
    throw new ValidationError(`Dish "${raw.name}" is not available (status: ${raw.status})`)
  }

  // Dish must belong to this chef
  if (raw.chefId !== chefId) {
    throw new NotFoundError(`Dish ${dishId} does not belong to chef ${chefId}`)
  }

  return {
    dishId:      raw._id?.toString() ?? raw.dishId ?? dishId,
    name:        raw.name,
    description: raw.description,
    price:       raw.price,
    currency:    raw.currency,
    dietaryTags: raw.dietaryTags ?? [],
    allergens:   raw.allergens ?? [],
    status:      raw.status,
    chefId:      raw.chefId,
  }
}

/**
 * Checks chef availability for a delivery date.
 * Returns { available: true } or { available: false, reason }.
 *
 * Uses the existing chef-service REST endpoint:
 *   GET /api/v1/chefs/:chefId/availability?date=YYYY-MM-DD
 */
export async function checkChefAvailability(
  chefId: string,
  date: string,
): Promise<{ available: boolean; reason?: string }> {
  const base = config.CHEF_SERVICE_URL
  const res = await fetch(
    `${base}/api/v1/chefs/${encodeURIComponent(chefId)}/availability?date=${encodeURIComponent(date)}`,
    { headers: internalHeaders() },
  )

  if (!res.ok) {
    // Non-2xx means we cannot confirm availability — treat as unavailable
    return { available: false, reason: `Availability check failed (${res.status})` }
  }

  const body = await res.json() as {
    statusCode?: number
    data?: { available: boolean; reason?: string }
    available?: boolean
    reason?: string
  }

  const data = body.data ?? body as { available: boolean; reason?: string }
  return { available: data.available, reason: data.reason }
}

/**
 * Resolves a chef user's chefId (ChefProfile._id) by calling
 * GET /api/v1/chefs/me on chef-service, impersonating the chef user.
 *
 * This is used by chef-facing order procedures to convert the gateway-injected
 * userId into the chefId that orders are keyed against.
 *
 * Throws ForbiddenError if the user has no chef profile.
 */
export async function resolveChefIdFromUserId(
  userId: string,
  userEmail: string,
): Promise<string> {
  const base = config.CHEF_SERVICE_URL

  const res = await fetch(`${base}/api/v1/chefs/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id':    userId,
      'X-User-Role':  'CHEF',
      'X-User-Email': userEmail,
    },
  })

  if (res.status === 404) {
    throw new ForbiddenError('No chef profile found for this user')
  }
  if (!res.ok) {
    throw new ForbiddenError(`Could not resolve chef profile: ${res.status}`)
  }

  const body = await res.json() as {
    statusCode?: number
    data?: { _id?: string; id?: string }
    _id?: string
    id?: string
  }

  // chef-service REST routes return plain JSON (via callTrpc → res.send)
  const chefId = (body.data as any)?._id
    ?? (body.data as any)?.id
    ?? (body as any)._id
    ?? (body as any).id

  if (!chefId) {
    throw new ForbiddenError('Could not determine chefId from chef profile response')
  }

  return String(chefId)
}
