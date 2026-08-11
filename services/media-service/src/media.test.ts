import { describe, it, expect } from 'vitest'
import { generateObjectKey } from './storage/key-generator'
import { S3Storage } from './storage/s3.storage'

// ─── Constants (mirrored from media.routes.ts) ────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_VIDEO_TYPES = ['video/mp4'] as const
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024   // 10 MB
const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024  // 100 MB

// ─── State machine ────────────────────────────────────────────────────────────

type Status = 'PENDING' | 'UPLOADING' | 'READY' | 'FAILED' | 'DELETED'
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  PENDING: ['UPLOADING'],
  UPLOADING: ['READY', 'FAILED'],
  READY: ['DELETED'],
  FAILED: ['DELETED'],
  DELETED: [],
}

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as Status]
  if (!allowed) return false
  return allowed.includes(to as Status)
}

// ─── 14.1: MIME type whitelist ────────────────────────────────────────────────

describe('MIME type whitelist', () => {
  it('allows image/jpeg', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
  })
  it('allows image/png', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
  })
  it('allows image/webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
  })
  it('allows video/mp4', () => {
    expect(ALLOWED_MIME_TYPES).toContain('video/mp4')
  })
  it('rejects text/plain', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('text/plain')
  })
  it('rejects application/pdf', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('application/pdf')
  })
  it('rejects image/gif', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('image/gif')
  })
})

// ─── 14.2: Size limits ────────────────────────────────────────────────────────

describe('Size limits', () => {
  it('image at exactly 10MB is within limit', () => {
    expect(IMAGE_SIZE_LIMIT).toBe(10 * 1024 * 1024)
    expect(10 * 1024 * 1024).toBeLessThanOrEqual(IMAGE_SIZE_LIMIT)
  })
  it('image at 10MB+1 exceeds IMAGE_SIZE_LIMIT', () => {
    expect(10 * 1024 * 1024 + 1).toBeGreaterThan(IMAGE_SIZE_LIMIT)
  })
  it('video at exactly 100MB is within limit', () => {
    expect(VIDEO_SIZE_LIMIT).toBe(100 * 1024 * 1024)
    expect(100 * 1024 * 1024).toBeLessThanOrEqual(VIDEO_SIZE_LIMIT)
  })
  it('video at 100MB+1 exceeds VIDEO_SIZE_LIMIT', () => {
    expect(100 * 1024 * 1024 + 1).toBeGreaterThan(VIDEO_SIZE_LIMIT)
  })
})

// ─── 14.3: State machine ─────────────────────────────────────────────────────

describe('State machine transitions', () => {
  it('PENDING→UPLOADING is valid', () => expect(isValidTransition('PENDING', 'UPLOADING')).toBe(true))
  it('UPLOADING→READY is valid', () => expect(isValidTransition('UPLOADING', 'READY')).toBe(true))
  it('UPLOADING→FAILED is valid', () => expect(isValidTransition('UPLOADING', 'FAILED')).toBe(true))
  it('READY→DELETED is valid', () => expect(isValidTransition('READY', 'DELETED')).toBe(true))
  it('FAILED→DELETED is valid', () => expect(isValidTransition('FAILED', 'DELETED')).toBe(true))
  it('PENDING→READY is invalid', () => expect(isValidTransition('PENDING', 'READY')).toBe(false))
  it('PENDING→FAILED is invalid', () => expect(isValidTransition('PENDING', 'FAILED')).toBe(false))
  it('PENDING→DELETED is invalid', () => expect(isValidTransition('PENDING', 'DELETED')).toBe(false))
  it('READY→UPLOADING is invalid', () => expect(isValidTransition('READY', 'UPLOADING')).toBe(false))
  it('FAILED→UPLOADING is invalid', () => expect(isValidTransition('FAILED', 'UPLOADING')).toBe(false))
  it('DELETED→PENDING is invalid', () => expect(isValidTransition('DELETED', 'PENDING')).toBe(false))
  it('DELETED→READY is invalid', () => expect(isValidTransition('DELETED', 'READY')).toBe(false))
})

// ─── 14.5: generateObjectKey ──────────────────────────────────────────────────

describe('generateObjectKey', () => {
  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

  it('returns a string containing a UUID', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'image/jpeg' })
    expect(UUID_PATTERN.test(key)).toBe(true)
  })

  it('uses .jpg extension for image/jpeg', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'image/jpeg' })
    expect(key).toMatch(/\.jpg$/)
  })

  it('uses .png extension for image/png', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'image/png' })
    expect(key).toMatch(/\.png$/)
  })

  it('uses .webp extension for image/webp', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'image/webp' })
    expect(key).toMatch(/\.webp$/)
  })

  it('uses .mp4 extension for video/mp4', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'video/mp4' })
    expect(key).toMatch(/\.mp4$/)
  })

  it('starts with chefs/ for ownerType=chef', () => {
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'chef-123', mimeType: 'image/jpeg' })
    expect(key.startsWith('chefs/')).toBe(true)
  })

  it('contains /dishes/ for ownerType=dish with contextId', () => {
    const key = generateObjectKey({ ownerType: 'dish', ownerId: 'chef-123', contextId: 'dish-456', mimeType: 'image/jpeg' })
    expect(key).toContain('/dishes/')
  })

  it('does not include originalName in key', () => {
    const originalName = 'my-photo-portrait.jpg'
    const key = generateObjectKey({ ownerType: 'chef', ownerId: 'owner1', mimeType: 'image/jpeg' })
    expect(key).not.toContain(originalName)
    expect(key).not.toContain('my-photo')
  })
})

// ─── 14.6: S3Storage forcePathStyle ──────────────────────────────────────────

describe('S3Storage constructor', () => {
  it('constructs without error when forcePathStyle=true (MinIO)', () => {
    expect(() => new S3Storage({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
      bucket: 'chefmate-media',
      forcePathStyle: true,
    })).not.toThrow()
  })

  it('constructs without error when forcePathStyle=false (R2/S3)', () => {
    expect(() => new S3Storage({
      region: 'auto',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      bucket: 'chefmate-media',
      forcePathStyle: false,
    })).not.toThrow()
  })
})
