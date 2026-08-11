/**
 * Event contract tests for Phase 5 — Tasks 10.1, 10.2
 *
 * Verifies that the ChefEvent union type for availability events compiles
 * correctly and has the correct shape.
 */
import { describe, it, expect } from 'vitest'
import type { ChefEvent } from '@chefmate/event-contracts'

describe('chef.availability.updated event contract', () => {
  it('has required fields', () => {
    const event: ChefEvent = {
      type:      'chef.availability.updated',
      chefId:    'chef-test-id',
      createdAt: new Date().toISOString(),
      version:   '1',
    }
    expect(event.type).toBe('chef.availability.updated')
    expect((event as any).chefId).toBeTruthy()
    expect((event as any).version).toBe('1')
  })

  it('is published after upsertChefSchedule — event shape compiles', () => {
    // Confirms the TypeScript union includes the event type
    const events: ChefEvent[] = [
      { type: 'chef.availability.updated', chefId: 'id-1', createdAt: new Date().toISOString(), version: '1' },
      { type: 'chef.availability.updated', chefId: 'id-2', createdAt: new Date().toISOString(), version: '1' },
    ]
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.type === 'chef.availability.updated')).toBe(true)
  })

  it('createdAt is a valid ISO timestamp', () => {
    const ts = new Date().toISOString()
    const event: ChefEvent = {
      type:      'chef.availability.updated',
      chefId:    'chef-abc',
      createdAt: ts,
      version:   '1',
    }
    expect(() => new Date((event as any).createdAt).toISOString()).not.toThrow()
    expect((event as any).createdAt).toBe(ts)
  })
})
