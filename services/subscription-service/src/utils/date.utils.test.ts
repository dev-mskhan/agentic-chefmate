import { describe, it, expect } from 'vitest'
import { computeNextPeriod, periodStartKey } from './date.utils'

describe('computeNextPeriod', () => {
  it('WEEKLY advances by 7 days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const { nextBillingDate, periodStart } = computeNextPeriod(from, 'WEEKLY')
    expect(periodStartKey(nextBillingDate)).toBe('2026-01-08')
    expect(periodStartKey(periodStart)).toBe('2026-01-01')
  })

  it('BIWEEKLY advances by 14 days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z')
    const { nextBillingDate } = computeNextPeriod(from, 'BIWEEKLY')
    expect(periodStartKey(nextBillingDate)).toBe('2026-01-15')
  })

  it('MONTHLY advances by one month same day', () => {
    const from = new Date('2026-01-15T00:00:00.000Z')
    const { nextBillingDate } = computeNextPeriod(from, 'MONTHLY')
    expect(periodStartKey(nextBillingDate)).toBe('2026-02-15')
  })

  it('MONTHLY Jan 31 → Feb 28 (non-leap)', () => {
    const from = new Date('2026-01-31T00:00:00.000Z')
    const { nextBillingDate } = computeNextPeriod(from, 'MONTHLY')
    expect(periodStartKey(nextBillingDate)).toBe('2026-02-28')
  })

  it('MONTHLY Jan 31 → Feb 29 (leap year 2028)', () => {
    const from = new Date('2028-01-31T00:00:00.000Z')
    const { nextBillingDate } = computeNextPeriod(from, 'MONTHLY')
    expect(periodStartKey(nextBillingDate)).toBe('2028-02-29')
  })

  it('MONTHLY Feb 29 leap → Mar 29', () => {
    const from = new Date('2028-02-29T00:00:00.000Z')
    const { nextBillingDate } = computeNextPeriod(from, 'MONTHLY')
    expect(periodStartKey(nextBillingDate)).toBe('2028-03-29')
  })
})
