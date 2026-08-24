/**
 * Unit tests for event publishing (14.1 event contracts shape)
 * Tests that MediaEvent union types compile correctly and have the right shape.
 */
import { describe, it, expect } from 'vitest'
import type { MediaEvent } from '@chefmate/event-contracts'

describe('MediaEvent contract shape', () => {
  it('media.uploaded event has required fields', () => {
    const event: MediaEvent = {
      type: 'media.uploaded',
      mediaId: 'test-id',
      chefId: 'owner-id',
      ownerType: 'chef',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      createdAt: new Date().toISOString(),
      version: '1',
    }
    expect(event.type).toBe('media.uploaded')
    expect(event.mediaId).toBeTruthy()
  })

  it('media.ready event has required fields', () => {
    const event: MediaEvent = {
      type: 'media.ready',
      mediaId: 'test-id',
      chefId: 'owner-id',
      createdAt: new Date().toISOString(),
      version: '1',
    }
    expect(event.type).toBe('media.ready')
  })

  it('media.failed event has required fields', () => {
    const event: MediaEvent = {
      type: 'media.failed',
      mediaId: 'test-id',
      chefId: 'owner-id',
      reason: 'Upload timeout',
      createdAt: new Date().toISOString(),
      version: '1',
    }
    expect(event.type).toBe('media.failed')
    expect(event.reason).toBeTruthy()
  })

  it('media.deleted event has required fields', () => {
    const event: MediaEvent = {
      type: 'media.deleted',
      mediaId: 'test-id',
      chefId: 'owner-id',
      createdAt: new Date().toISOString(),
      version: '1',
    }
    expect(event.type).toBe('media.deleted')
  })
})
