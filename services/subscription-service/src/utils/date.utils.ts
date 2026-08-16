/**
 * Date arithmetic utilities for subscription billing periods.
 * All computations are in UTC to avoid timezone drift.
 */

export type SubscriptionFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export interface PeriodResult {
  nextBillingDate: Date
  nextOrderDate:   Date
  periodStart:     Date
  periodEnd:       Date
}

/**
 * Computes the next billing period from a given start date.
 *
 * - WEEKLY: +7 days
 * - BIWEEKLY: +14 days
 * - MONTHLY: same day-of-month next month, clamped to last day if needed
 *   (e.g. Jan 31 → Feb 28/29; Feb 29 → Mar 29)
 */
export function computeNextPeriod(fromDate: Date, frequency: SubscriptionFrequency): PeriodResult {
  const periodStart = new Date(fromDate)
  periodStart.setUTCHours(0, 0, 0, 0)

  let periodEnd: Date

  if (frequency === 'WEEKLY') {
    periodEnd = addDaysUTC(periodStart, 6)
  } else if (frequency === 'BIWEEKLY') {
    periodEnd = addDaysUTC(periodStart, 13)
  } else {
    // MONTHLY: end = day before same date next month
    periodEnd = addDaysUTC(addMonthsUTC(periodStart, 1), -1)
  }

  let nextBillingDate: Date

  if (frequency === 'WEEKLY') {
    nextBillingDate = addDaysUTC(periodStart, 7)
  } else if (frequency === 'BIWEEKLY') {
    nextBillingDate = addDaysUTC(periodStart, 14)
  } else {
    nextBillingDate = addMonthsUTC(periodStart, 1)
  }

  return {
    nextBillingDate,
    nextOrderDate: nextBillingDate,   // same for MVP
    periodStart,
    periodEnd,
  }
}

/**
 * Returns YYYY-MM-DD string in UTC for use as idempotency key component.
 */
export function periodStartKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

/**
 * Adds N months in UTC, clamping to the last day of the target month.
 * Jan 31 + 1 month = Feb 28 (or 29 in leap year), not Mar 3.
 */
function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date)
  const targetMonth = result.getUTCMonth() + months
  const targetYear  = result.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalMonth = ((targetMonth % 12) + 12) % 12

  // Last day of target month
  const lastDay = new Date(Date.UTC(targetYear, normalMonth + 1, 0)).getUTCDate()
  const clampedDay = Math.min(result.getUTCDate(), lastDay)

  result.setUTCFullYear(targetYear, normalMonth, clampedDay)
  return result
}
