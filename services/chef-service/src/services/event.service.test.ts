/**
 * Event tests for chef-service (Tasks 16.1, 16.2, 16.3)
 *
 * Verifies that events are published correctly after procedure calls.
 * Uses a mock producer to capture emitted events without requiring Kafka.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mock the event-contracts producer ────────────────────────────────────────

vi.mock('@chefmate/event-contracts', () => ({
  CHEF_EVENTS_TOPIC: 'chef.events',
  createProducer: vi.fn(() => ({
    connect:    vi.fn(),
    disconnect: vi.fn(),
    emit:       vi.fn().mockResolvedValue(undefined),
  })),
}))

// Also mock kafkajs
vi.mock('kafkajs', () => ({
  Kafka: vi.fn().mockImplementation(() => ({})),
}))

import { initEventService, disconnectEventService, publishChefEvent } from './event.service'
import { createProducer } from '@chefmate/event-contracts'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('event.service — chef events', () => {
  let mockEmit: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Set up fresh mock producer
    mockEmit = vi.fn().mockResolvedValue(undefined)
    ;(createProducer as ReturnType<typeof vi.fn>).mockReturnValue({
      connect:    vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      emit:       mockEmit,
    })

    // Re-initialize the service
    await disconnectEventService()
    await initEventService('localhost:9092')
  })

  // ── Task 16.1: chef.created ───────────────────────────────────────────────

  it('emits chef.created event with correct payload', async () => {
    const event = {
      type:        'chef.created' as const,
      chefId:      'chef123',
      userId:      'user456',
      displayName: 'Chef Hassan',
      createdAt:   '2024-01-01T00:00:00.000Z',
      version:     '1' as const,
    }

    await publishChefEvent(event)

    expect(mockEmit).toHaveBeenCalledOnce()
    expect(mockEmit).toHaveBeenCalledWith('chef.events', event)
    const [topic, payload] = mockEmit.mock.calls[0] as [string, typeof event]
    expect(payload.type).toBe('chef.created')
    expect(payload.chefId).toBe('chef123')
    expect(payload.userId).toBe('user456')
    expect(payload.displayName).toBe('Chef Hassan')
  })

  // ── Task 16.2: chef.updated ───────────────────────────────────────────────

  it('emits chef.updated event with changedFields', async () => {
    const event = {
      type:          'chef.updated' as const,
      chefId:        'chef123',
      changedFields: ['displayName', 'bio'],
      createdAt:     '2024-01-01T00:00:00.000Z',
      version:       '1' as const,
    }

    await publishChefEvent(event)

    expect(mockEmit).toHaveBeenCalledOnce()
    const [, payload] = mockEmit.mock.calls[0] as [string, typeof event]
    expect(payload.type).toBe('chef.updated')
    expect(payload.changedFields).toContain('displayName')
    expect(payload.changedFields).toContain('bio')
  })

  // ── Task 16.3: chef.status_changed ───────────────────────────────────────

  it('emits chef.status_changed event with old/new status', async () => {
    const event = {
      type:      'chef.status_changed' as const,
      chefId:    'chef123',
      oldStatus: 'PENDING',
      newStatus: 'ACTIVE',
      changedBy: 'admin-user-id',
      reason:    'Documents verified',
      createdAt: '2024-01-01T00:00:00.000Z',
      version:   '1' as const,
    }

    await publishChefEvent(event)

    expect(mockEmit).toHaveBeenCalledOnce()
    const [, payload] = mockEmit.mock.calls[0] as [string, typeof event]
    expect(payload.type).toBe('chef.status_changed')
    expect(payload.oldStatus).toBe('PENDING')
    expect(payload.newStatus).toBe('ACTIVE')
    expect(payload.changedBy).toBe('admin-user-id')
    expect(payload.reason).toBe('Documents verified')
  })

  it('skips event emission when producer is not initialized', async () => {
    await disconnectEventService() // disconnect to simulate uninitialized

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await publishChefEvent({
      type:        'chef.created',
      chefId:      'chef1',
      userId:      'user1',
      displayName: 'Chef Test',
      createdAt:   new Date().toISOString(),
      version:     '1',
    })

    expect(mockEmit).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Producer not initialized'),
      'chef.created',
    )
    warnSpy.mockRestore()
  })
})
