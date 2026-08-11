/**
 * Unit tests for Phase 3 dish event contract shapes (Tasks 8.1-8.3)
 *
 * Verifies that ChefEvent union types for dish events compile correctly
 * and have the correct shape. These are compile-time + shape-assertion tests.
 */
import { describe, it, expect } from 'vitest'
import type { ChefEvent } from '@chefmate/event-contracts'

describe('dish.created event contract', () => {
  it('has required fields', () => {
    const event: ChefEvent = {
      type:      'dish.created',
      dishId:    'dish-123',
      chefId:    'chef-456',
      name:      'Chicken Karahi',
      createdAt: new Date().toISOString(),
      version:   '1',
    }
    expect(event.type).toBe('dish.created')
    expect((event as any).dishId).toBe('dish-123')
    expect((event as any).chefId).toBe('chef-456')
    expect((event as any).name).toBe('Chicken Karahi')
    expect((event as any).version).toBe('1')
  })
})

describe('dish.updated event contract', () => {
  it('has required fields including changedFields', () => {
    const event: ChefEvent = {
      type:          'dish.updated',
      dishId:        'dish-123',
      chefId:        'chef-456',
      changedFields: ['name', 'price'],
      createdAt:     new Date().toISOString(),
      version:       '1',
    }
    expect(event.type).toBe('dish.updated')
    expect((event as any).changedFields).toEqual(['name', 'price'])
  })

  it('changedFields can be empty array', () => {
    const event: ChefEvent = {
      type:          'dish.updated',
      dishId:        'dish-123',
      chefId:        'chef-456',
      changedFields: [],
      createdAt:     new Date().toISOString(),
      version:       '1',
    }
    expect((event as any).changedFields).toHaveLength(0)
  })
})

describe('dish.archived event contract', () => {
  it('has required fields', () => {
    const event: ChefEvent = {
      type:      'dish.archived',
      dishId:    'dish-123',
      chefId:    'chef-456',
      createdAt: new Date().toISOString(),
      version:   '1',
    }
    expect(event.type).toBe('dish.archived')
    expect((event as any).dishId).toBeTruthy()
    expect((event as any).chefId).toBeTruthy()
  })
})
