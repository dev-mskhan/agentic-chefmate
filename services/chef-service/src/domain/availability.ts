import type Redis from 'ioredis'
import { ChefSchedule } from '../models/chef-schedule.model'
import { ChefProfile } from '../models/chef-profile.model'

export interface AvailabilityResult {
  available: boolean
  reason?: string
}

const DAY_MAP: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Determines whether a chef can accept a new order for the given date.
 *
 * Checks (in order):
 *  1. Schedule document exists
 *  2. Chef profile is ACTIVE (both verificationStatus and accountState)
 *  3. Date is not a blackout date
 *  4. Lead time is met (date is sufficiently in the future)
 *  5. Date matches a recurring active day OR a one-off date
 *  6. Daily order capacity has not been reached (checked via Redis counter)
 *
 * @param chefId - The chef's MongoDB ObjectId string
 * @param requestedDate - Target date as a Date or YYYY-MM-DD string
 * @param redis - ioredis instance (injected for testability)
 */
export async function canChefAcceptOrder(
  chefId: string,
  requestedDate: Date | string,
  redis: Redis,
): Promise<AvailabilityResult> {
  const date = typeof requestedDate === 'string' ? new Date(requestedDate) : requestedDate
  const dateStr = toDateString(date)

  // 1. Schedule must exist
  const schedule = await ChefSchedule.findOne({ chefId }).lean()
  if (!schedule) {
    return { available: false, reason: 'Chef has no schedule configured' }
  }

  // 2. Chef profile must be fully active
  const chef = await ChefProfile.findById(chefId)
    .select('verificationStatus accountState')
    .lean()
  if (!chef) {
    return { available: false, reason: 'Chef profile not found' }
  }
  if (chef.verificationStatus !== 'ACTIVE') {
    return { available: false, reason: 'Chef is not verified' }
  }
  if (chef.accountState !== 'ACTIVE') {
    return { available: false, reason: 'Chef account is not active' }
  }

  // 3. Date must not be blacked out
  const blackout = schedule.blackoutDates.find((b) => b.date === dateStr)
  if (blackout) {
    return { available: false, reason: `Blackout date: ${blackout.reason}` }
  }

  // 4. Lead time: requested date must be at least leadTimeHours in the future
  const leadTimeMs = schedule.capacity.leadTimeHours * 60 * 60 * 1000
  if (date.getTime() - Date.now() < leadTimeMs) {
    return { available: false, reason: 'Lead time not met' }
  }

  // 5. Must have a recurring active day or a one-off date entry
  const dayOfWeek = DAY_MAP[date.getDay()]!
  const hasRecurring = schedule.recurringDays.some(
    (d) => d.dayOfWeek === dayOfWeek && d.isActive,
  )
  const hasOneOff = schedule.oneOffDates.some((o) => o.date === dateStr)
  if (!hasRecurring && !hasOneOff) {
    return { available: false, reason: `No schedule for ${dayOfWeek}` }
  }

  // 6. Capacity: check Redis counter set by Order Service
  // Key: chef:{chefId}:orders:{YYYY-MM-DD}
  // If absent, treat as 0 (Order Service has not recorded any orders yet)
  const counterKey = `chef:${chefId}:orders:${dateStr}`
  const rawCount = await redis.get(counterKey)
  const currentCount = rawCount ? parseInt(rawCount, 10) : 0
  if (currentCount >= schedule.capacity.maxOrdersPerDay) {
    return { available: false, reason: 'Capacity full for this date' }
  }

  return { available: true }
}
