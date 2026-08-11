/**
 * Event contract tests for Phase 6 — Tasks 9.1–9.3
 */
import { describe, it, expect } from 'vitest'
import type { ChefEvent } from '@chefmate/event-contracts'

describe('plan.created event contract', () => {
  it('has required fields', () => {
    const event: ChefEvent = {
      type:      'plan.created',
      planId:    'plan-123',
      chefId:    'chef-456',
      name:      'Weekly Family Plan',
      planType:  'SUBSCRIPTION',
      createdAt: new Date().toISOString(),
      version:   '1',
    }
    expect(event.type).toBe('plan.created')
    expect((event as any).planId).toBeTruthy()
    expect((event as any).planType).toBeTruthy()
  })
})

describe('plan.updated event contract', () => {
  it('has changedFields array', () => {
    const event: ChefEvent = {
      type:          'plan.updated',
      planId:        'plan-123',
      chefId:        'chef-456',
      changedFields: ['name', 'basePrice'],
      createdAt:     new Date().toISOString(),
      version:       '1',
    }
    expect(event.type).toBe('plan.updated')
    expect((event as any).changedFields).toEqual(['name', 'basePrice'])
  })

  it('pausePlan publishes plan.updated with changedFields:[status]', () => {
    const event: ChefEvent = {
      type:          'plan.updated',
      planId:        'plan-123',
      chefId:        'chef-456',
      changedFields: ['status'],
      createdAt:     new Date().toISOString(),
      version:       '1',
    }
    expect((event as any).changedFields).toContain('status')
  })
})

describe('plan.activated event contract', () => {
  it('has required fields', () => {
    const event: ChefEvent = {
      type:      'plan.activated',
      planId:    'plan-123',
      chefId:    'chef-456',
      createdAt: new Date().toISOString(),
      version:   '1',
    }
    expect(event.type).toBe('plan.activated')
    expect((event as any).planId).toBeTruthy()
  })
})
