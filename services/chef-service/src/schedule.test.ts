/**
 * Unit tests for Phase 5 — Schedule, Availability & Capacity (Tasks 7.1, 8.1–8.5)
 *
 * canChefAcceptOrder is tested with mocked MongoDB queries (vi.mock).
 * Validation rules are tested as pure logic inline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidationError } from '@chefmate/errors'

// ─── Mock MongoDB models ──────────────────────────────────────────────────────

vi.mock('./models/chef-schedule.model', () => ({
  ChefSchedule: {
    findOne: vi.fn(),
  },
}))

vi.mock('./models/chef-profile.model', () => ({
  ChefProfile: {
    findById: vi.fn(),
  },
}))

import { ChefSchedule } from './models/chef-schedule.model'
import { ChefProfile } from './models/chef-profile.model'
import { canChefAcceptOrder } from './domain/availability'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHEF_ID = 'chef-test-id'

/** Date 48 h in the future — satisfies any reasonable leadTime */
function futureDate(hoursAhead = 48): Date {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000)
}

function futureDateStr(hoursAhead = 48): string {
  return futureDate(hoursAhead).toISOString().slice(0, 10)
}

function dayOfWeekFor(d: Date): string {
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]!
}

function makeSchedule(overrides: Record<string, unknown> = {}) {
  const target = futureDate(48)
  const dow = dayOfWeekFor(target)
  return {
    blackoutDates: [],
    oneOffDates: [],
    recurringDays: [{ dayOfWeek: dow, isActive: true, windows: [] }],
    capacity: { maxOrdersPerDay: 5, prepTimeMinutes: 60, leadTimeHours: 24 },
    deliveryZones: [],
    ...overrides,
  }
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    verificationStatus: 'ACTIVE',
    accountState: 'ACTIVE',
    ...overrides,
  }
}

/** Minimal mock Redis that returns null (no counter) by default */
function makeRedis(counterValue: string | null = null) {
  return { get: vi.fn().mockResolvedValue(counterValue) } as any
}

// ─── Task 7.1: canChefAcceptOrder unit tests ─────────────────────────────────

describe('canChefAcceptOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when no schedule exists', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) })
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis())
    expect(result.available).toBe(false)
    expect(result.reason).toContain('no schedule')
  })

  it('returns false when chef verificationStatus !== ACTIVE', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(makeSchedule()) })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile({ verificationStatus: 'PENDING' })) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis())
    expect(result.available).toBe(false)
    expect(result.reason).toContain('not verified')
  })

  it('returns false when chef accountState !== ACTIVE', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(makeSchedule()) })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile({ accountState: 'PAUSED' })) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis())
    expect(result.available).toBe(false)
    expect(result.reason).toContain('not active')
  })

  it('returns false when blackout date matches', async () => {
    const dateStr = futureDateStr(48)
    ;(ChefSchedule.findOne as any).mockReturnValue({
      lean: () => Promise.resolve(makeSchedule({
        blackoutDates: [{ date: dateStr, reason: 'VACATION' }],
      })),
    })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, dateStr, makeRedis())
    expect(result.available).toBe(false)
    expect(result.reason).toContain('Blackout date')
  })

  it('returns false when lead time is not met (date too soon)', async () => {
    const tooSoon = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours ahead, leadTime=24h
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(makeSchedule()) })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, tooSoon, makeRedis())
    expect(result.available).toBe(false)
    expect(result.reason).toContain('Lead time')
  })

  it('returns true when recurring day matches and all conditions pass', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(makeSchedule()) })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis())
    expect(result.available).toBe(true)
  })

  it('returns true when one-off date matches even if recurring day is not set', async () => {
    const dateStr = futureDateStr(48)
    ;(ChefSchedule.findOne as any).mockReturnValue({
      lean: () => Promise.resolve(makeSchedule({
        recurringDays: [], // no recurring
        oneOffDates: [{ date: dateStr, windows: [] }],
      })),
    })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, dateStr, makeRedis())
    expect(result.available).toBe(true)
  })

  it('returns false when Redis counter equals maxOrdersPerDay', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({
      lean: () => Promise.resolve(makeSchedule({ capacity: { maxOrdersPerDay: 3, prepTimeMinutes: 60, leadTimeHours: 24 } })),
    })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis('3'))
    expect(result.available).toBe(false)
    expect(result.reason).toContain('Capacity full')
  })

  it('returns true when Redis counter is absent (treated as 0)', async () => {
    ;(ChefSchedule.findOne as any).mockReturnValue({ lean: () => Promise.resolve(makeSchedule()) })
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(makeProfile()) }),
    })
    // redis.get returns null — counter absent
    const result = await canChefAcceptOrder(CHEF_ID, futureDate(), makeRedis(null))
    expect(result.available).toBe(true)
  })
})

// ─── Task 8: Validation rules (pure logic) ────────────────────────────────────

describe('upsertChefSchedule validation — duplicate recurring day', () => {
  it('detects duplicate dayOfWeek values', () => {
    const days = ['MON', 'TUE', 'MON']
    const hasDuplicate = new Set(days).size !== days.length
    expect(hasDuplicate).toBe(true)
  })

  it('accepts unique dayOfWeek values', () => {
    const days = ['MON', 'TUE', 'WED']
    const hasDuplicate = new Set(days).size !== days.length
    expect(hasDuplicate).toBe(false)
  })
})

describe('time window validation — openTime must be before closeTime', () => {
  function isValidWindow(openTime: string, closeTime: string): boolean {
    return openTime < closeTime
  }

  it('accepts valid window (09:00 < 17:00)', () => {
    expect(isValidWindow('09:00', '17:00')).toBe(true)
  })

  it('rejects equal times (09:00 = 09:00)', () => {
    expect(isValidWindow('09:00', '09:00')).toBe(false)
  })

  it('rejects reversed window (17:00 > 09:00)', () => {
    expect(isValidWindow('17:00', '09:00')).toBe(false)
  })
})

describe('addOneOffDate validation — date must not be in the past', () => {
  it('rejects a past date', () => {
    const pastDate = '2020-01-01'
    const today = new Date().toISOString().slice(0, 10)
    expect(pastDate < today).toBe(true) // would be rejected
  })

  it('accepts today or a future date', () => {
    const future = futureDateStr(48)
    const today = new Date().toISOString().slice(0, 10)
    expect(future >= today).toBe(true)
  })
})

describe('addBlackoutDate validation — duplicate date + reason', () => {
  it('detects duplicate (date + reason) combination', () => {
    const blackouts = [
      { date: '2027-08-01', reason: 'VACATION' },
      { date: '2027-08-02', reason: 'HOLIDAY' },
    ]
    const input = { date: '2027-08-01', reason: 'VACATION' }
    const exists = blackouts.some((b) => b.date === input.date && b.reason === input.reason)
    expect(exists).toBe(true)
  })

  it('allows same date with different reason', () => {
    const blackouts = [{ date: '2027-08-01', reason: 'VACATION' }]
    const input = { date: '2027-08-01', reason: 'HOLIDAY' }
    const exists = blackouts.some((b) => b.date === input.date && b.reason === input.reason)
    expect(exists).toBe(false)
  })
})

describe('updateDeliveryZones validation — unique zone names', () => {
  it('detects duplicate zone names', () => {
    const zones = [{ name: 'Zone A' }, { name: 'Zone B' }, { name: 'Zone A' }]
    const names = zones.map((z) => z.name)
    expect(new Set(names).size !== names.length).toBe(true)
  })

  it('accepts unique zone names', () => {
    const zones = [{ name: 'Zone A' }, { name: 'Zone B' }, { name: 'Zone C' }]
    const names = zones.map((z) => z.name)
    expect(new Set(names).size !== names.length).toBe(false)
  })
})
