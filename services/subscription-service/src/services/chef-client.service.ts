import { config } from '../config'
import { NotFoundError, ValidationError } from '@chefmate/errors'

export interface PlanSnapshot {
  planId:   string
  chefId:   string
  name:     string
  type:     string
  frequency?: string
  status:   string
  tiers:    Array<{
    _id:          string
    name:         string
    description?: string
    dishIds:      string[]
    portionsPerDish?: number
    priceOverride?: number
  }>
  basePrice?: number
  currency:   string
  pauseRules: { allowPause: boolean; maxPauseDays?: number }
  skipRules:  { allowSkip: boolean; minNoticeHours?: number }
  swapRules:  { allowSwap: boolean; swapWindowHours?: number }
  availabilityRules: {
    startDate?: string
    endDate?: string
    availableDays: string[]
    maxSubscribers?: number
  }
}

function internalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-User-Id':    'system',
    'X-User-Role':  'ADMIN',
    'X-User-Email': 'system@chefmate.internal',
  }
}

export async function fetchPlanSnapshot(planId: string, chefId: string): Promise<PlanSnapshot> {
  const base = config.CHEF_SERVICE_URL
  const res = await fetch(`${base}/api/v1/chefs/${chefId}/plans/${planId}`, {
    headers: internalHeaders(),
  })

  if (res.status === 404) throw new NotFoundError(`Plan ${planId} not found`)
  if (!res.ok) throw new ValidationError(`Failed to fetch plan: ${res.status}`)

  const body = await res.json() as { statusCode?: number; data?: Record<string, unknown>; [key: string]: unknown }
  const raw = (body.data ?? body) as any

  if (raw.status !== 'ACTIVE') {
    throw new ValidationError(`Plan "${raw.name}" is not active (status: ${raw.status})`)
  }
  if (raw.type !== 'SUBSCRIPTION') {
    throw new ValidationError(`Plan "${raw.name}" is not a subscription plan (type: ${raw.type})`)
  }

  return {
    planId:            raw._id?.toString() ?? planId,
    chefId:            raw.chefId,
    name:              raw.name,
    type:              raw.type,
    frequency:         raw.frequency,
    status:            raw.status,
    tiers:             raw.tiers ?? [],
    basePrice:         raw.basePrice,
    currency:          raw.currency ?? 'PKR',
    pauseRules:        raw.pauseRules ?? { allowPause: true },
    skipRules:         raw.skipRules  ?? { allowSkip: true },
    swapRules:         raw.swapRules  ?? { allowSwap: true },
    availabilityRules: raw.availabilityRules ?? { availableDays: [] },
  }
}

export async function validateChef(chefId: string): Promise<{ isEligible: boolean; reason?: string }> {
  const base = config.CHEF_SERVICE_URL
  const res = await fetch(`${base}/api/v1/chefs/${chefId}/status`, { headers: internalHeaders() })

  if (res.status === 404) throw new NotFoundError(`Chef ${chefId} not found`)
  if (!res.ok) throw new ValidationError(`Failed to fetch chef status: ${res.status}`)

  const body = await res.json() as any
  const data = body.data ?? body

  if (data.verificationStatus !== 'ACTIVE') return { isEligible: false, reason: 'Chef is not verified' }
  if (data.accountState !== 'ACTIVE') return { isEligible: false, reason: 'Chef account is not active' }
  return { isEligible: true }
}

export async function fetchDishForSwapValidation(
  chefId: string,
  dishId: string,
): Promise<{ dishId: string; name: string; status: string; chefId: string }> {
  const base = config.CHEF_SERVICE_URL
  const res = await fetch(`${base}/api/v1/chefs/${chefId}/dishes/${dishId}`, { headers: internalHeaders() })

  if (res.status === 404) throw new NotFoundError(`Dish ${dishId} not found for chef ${chefId}`)
  if (!res.ok) throw new ValidationError(`Failed to fetch dish: ${res.status}`)

  const body = await res.json() as any
  const raw = body.data ?? body

  if (raw.status !== 'ACTIVE') throw new ValidationError(`Dish "${raw.name}" is not active`)
  return { dishId: raw._id?.toString() ?? dishId, name: raw.name, status: raw.status, chefId: raw.chefId }
}
