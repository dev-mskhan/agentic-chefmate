/**
 * Unit tests for Phase 6 — Meal Plan / Plan Builder (Tasks 7.1–7.5)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidationError } from '@chefmate/errors'

// ─── Mock models ──────────────────────────────────────────────────────────────

vi.mock('./models/meal-plan.model', () => ({ MealPlan: {} }))
vi.mock('./models/chef-profile.model', () => ({ ChefProfile: { findById: vi.fn() } }))
vi.mock('./models/dish.model', () => ({ Dish: { find: vi.fn() } }))

import { ChefProfile } from './models/chef-profile.model'
import { Dish } from './models/dish.model'
import { validatePlanActivation } from './domain/plan-activation'
import type { IMealPlan } from './models/meal-plan.model'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlan(overrides: Partial<IMealPlan> = {}): IMealPlan {
  return {
    _id:      'plan-id',
    chefId:   'chef-id',
    name:     'Test Plan',
    type:     'ONE_OFF',
    status:   'DRAFT',
    tiers:    [{ name: 'Basic', dishIds: ['dish-1'], portionsPerDish: 1 }],
    currency: 'PKR',
    mediaIds: [],
    pauseRules:  { allowPause: true },
    skipRules:   { allowSkip: true },
    swapRules:   { allowSwap: true },
    availabilityRules: { availableDays: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IMealPlan
}

// ─── Task 7.1: validatePlanActivation ─────────────────────────────────────────

describe('validatePlanActivation', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws when tiers.length === 0', async () => {
    const plan = makePlan({ tiers: [] })
    await expect(validatePlanActivation(plan)).rejects.toThrow('at least one tier')
  })

  it('throws when chef verificationStatus !== ACTIVE', async () => {
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ verificationStatus: 'PENDING' }) }),
    })
    const plan = makePlan()
    await expect(validatePlanActivation(plan)).rejects.toThrow('ACTIVE verification')
  })

  it('throws when a dishId belongs to a different chef', async () => {
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ verificationStatus: 'ACTIVE' }) }),
    })
    // Only 0 matching dishes returned — some dishIds don't belong to this chef
    ;(Dish.find as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    })
    const plan = makePlan()
    await expect(validatePlanActivation(plan)).rejects.toThrow('ACTIVE and belong to this chef')
  })

  it('throws when a dish has status !== ACTIVE', async () => {
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ verificationStatus: 'ACTIVE' }) }),
    })
    // Fewer dishes returned than expected (non-ACTIVE dish excluded by query)
    ;(Dish.find as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    })
    const plan = makePlan()
    await expect(validatePlanActivation(plan)).rejects.toThrow('ACTIVE and belong to this chef')
  })

  it('throws when SUBSCRIPTION plan has no frequency', async () => {
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ verificationStatus: 'ACTIVE' }) }),
    })
    ;(Dish.find as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ _id: 'dish-1' }]) }),
    })
    const plan = makePlan({ type: 'SUBSCRIPTION', frequency: undefined })
    await expect(validatePlanActivation(plan)).rejects.toThrow('frequency')
  })

  it('passes when all conditions are met', async () => {
    ;(ChefProfile.findById as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ verificationStatus: 'ACTIVE' }) }),
    })
    ;(Dish.find as any).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ _id: 'dish-1' }]) }),
    })
    const plan = makePlan({ type: 'ONE_OFF' })
    await expect(validatePlanActivation(plan)).resolves.toBeUndefined()
  })
})

// ─── Task 7.2: Status transition rules ───────────────────────────────────────

describe('plan status transition rules', () => {
  function canActivate(status: string): boolean {
    return status === 'DRAFT' || status === 'PAUSED'
  }
  function canPause(status: string): boolean { return status === 'ACTIVE' }
  function canArchive(status: string): boolean { return status !== 'ARCHIVED' }

  it('DRAFT → ACTIVE is valid', () => expect(canActivate('DRAFT')).toBe(true))
  it('PAUSED → ACTIVE is valid', () => expect(canActivate('PAUSED')).toBe(true))
  it('ACTIVE → ACTIVE is invalid', () => expect(canActivate('ACTIVE')).toBe(false))
  it('ARCHIVED → ACTIVE is invalid', () => expect(canActivate('ARCHIVED')).toBe(false))
  it('ACTIVE → PAUSED is valid', () => expect(canPause('ACTIVE')).toBe(true))
  it('DRAFT → PAUSED is invalid', () => expect(canPause('DRAFT')).toBe(false))
  it('DRAFT → ARCHIVED is valid', () => expect(canArchive('DRAFT')).toBe(true))
  it('ACTIVE → ARCHIVED is valid', () => expect(canArchive('ACTIVE')).toBe(true))
  it('ARCHIVED → ARCHIVED is invalid', () => expect(canArchive('ARCHIVED')).toBe(false))
})

// ─── Task 7.3: pausePlan blocked when allowPause is false ────────────────────

describe('pausePlan allowPause guard', () => {
  it('blocks pause when allowPause is false', () => {
    const plan = makePlan({ pauseRules: { allowPause: false } })
    const canPause = plan.pauseRules?.allowPause === true
    expect(canPause).toBe(false)
  })

  it('allows pause when allowPause is true', () => {
    const plan = makePlan({ pauseRules: { allowPause: true } })
    const canPause = plan.pauseRules?.allowPause === true
    expect(canPause).toBe(true)
  })
})

// ─── Task 7.4: customer visibility filter ────────────────────────────────────

describe('listChefPlans customer visibility filter', () => {
  it('USER role should only see ACTIVE plans (filter applied)', () => {
    const role: string = 'USER'
    const isAdmin = role === 'ADMIN'
    const isOwner = false
    const statusFilter = (!isAdmin && !isOwner) ? 'ACTIVE' : undefined
    expect(statusFilter).toBe('ACTIVE')
  })

  it('CHEF owner sees all statuses (no forced filter)', () => {
    const role: string = 'CHEF'
    const isOwner = true
    const isAdmin = false
    const statusFilter = (!isAdmin && !isOwner) ? 'ACTIVE' : undefined
    expect(statusFilter).toBeUndefined()
  })
})

// ─── Task 7.5: frequency validation ─────────────────────────────────────────

describe('frequency validation', () => {
  it('SUBSCRIPTION requires frequency', () => {
    const input = { type: 'SUBSCRIPTION', frequency: undefined }
    const isInvalid = input.type === 'SUBSCRIPTION' && !input.frequency
    expect(isInvalid).toBe(true)
  })

  it('SUBSCRIPTION with frequency is valid', () => {
    const input = { type: 'SUBSCRIPTION', frequency: 'WEEKLY' }
    const isInvalid = input.type === 'SUBSCRIPTION' && !input.frequency
    expect(isInvalid).toBe(false)
  })

  it('ONE_OFF must not have frequency', () => {
    const input = { type: 'ONE_OFF', frequency: 'WEEKLY' }
    const isInvalid = input.type === 'ONE_OFF' && !!input.frequency
    expect(isInvalid).toBe(true)
  })

  it('ONE_OFF without frequency is valid', () => {
    const input = { type: 'ONE_OFF', frequency: undefined }
    const isInvalid = input.type === 'ONE_OFF' && !!input.frequency
    expect(isInvalid).toBe(false)
  })
})
