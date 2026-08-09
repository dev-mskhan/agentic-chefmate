/**
 * Unit tests for RedisCacheService
 *
 * Uses an in-memory mock of ioredis to avoid requiring a live Redis connection.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { RedisCacheService } from './redis-cache.service'
import type { IChefProfile } from '../models/chef-profile.model'

// ── Minimal in-memory Redis mock ─────────────────────────────────────────────

class MockRedis {
  private store: Map<string, string> = new Map()
  private ttls:  Map<string, number>  = new Map()
  private counters: Map<string, number> = new Map()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string, _mode?: string, ttl?: number): Promise<void> {
    this.store.set(key, value)
    if (ttl) this.ttls.set(key, ttl)
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
    this.ttls.delete(key)
    this.counters.delete(key)
  }

  async incr(key: string): Promise<number> {
    const current = this.counters.get(key) ?? 0
    const next    = current + 1
    this.counters.set(key, next)
    return next
  }

  async expire(key: string, ttl: number): Promise<void> {
    this.ttls.set(key, ttl)
  }

  getTtl(key: string): number | undefined {
    return this.ttls.get(key)
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RedisCacheService', () => {
  let redis:   MockRedis
  let service: RedisCacheService

  beforeEach(() => {
    redis   = new MockRedis()
    service = new RedisCacheService(redis as any)
  })

  // ── Profile ──────────────────────────────────────────────────────────────

  describe('getProfile / setProfile / invalidateProfile', () => {
    const chefId = 'chef123'
    const mockProfile = {
      userId:      'user1',
      displayName: 'Chef Ali',
    } as unknown as IChefProfile

    it('returns null on cache miss', async () => {
      const result = await service.getProfile(chefId)
      expect(result).toBeNull()
    })

    it('returns cached profile after setProfile', async () => {
      await service.setProfile(chefId, mockProfile)
      const result = await service.getProfile(chefId)
      expect(result).toMatchObject({ userId: 'user1', displayName: 'Chef Ali' })
    })

    it('sets TTL of 600s on setProfile', async () => {
      await service.setProfile(chefId, mockProfile)
      const ttl = redis.getTtl(`chef:${chefId}:profile`)
      expect(ttl).toBe(600)
    })

    it('returns null after invalidateProfile', async () => {
      await service.setProfile(chefId, mockProfile)
      await service.invalidateProfile(chefId)
      const result = await service.getProfile(chefId)
      expect(result).toBeNull()
    })
  })

  // ── userId → chefId ──────────────────────────────────────────────────────

  describe('getUserChefId / setUserChefId / invalidateUserChefId', () => {
    const userId  = 'user456'
    const chefId  = 'chef789'

    it('returns null on cache miss', async () => {
      const result = await service.getUserChefId(userId)
      expect(result).toBeNull()
    })

    it('returns chefId after setUserChefId', async () => {
      await service.setUserChefId(userId, chefId)
      const result = await service.getUserChefId(userId)
      expect(result).toBe(chefId)
    })

    it('sets TTL of 1800s on setUserChefId', async () => {
      await service.setUserChefId(userId, chefId)
      const ttl = redis.getTtl(`chef:${userId}:id`)
      expect(ttl).toBe(1800)
    })

    it('returns null after invalidateUserChefId', async () => {
      await service.setUserChefId(userId, chefId)
      await service.invalidateUserChefId(userId)
      const result = await service.getUserChefId(userId)
      expect(result).toBeNull()
    })
  })

  // ── Rate limiting ────────────────────────────────────────────────────────

  describe('checkUpdateRateLimit', () => {
    const userId = 'rateUser'

    it('allows first 20 calls', async () => {
      for (let i = 0; i < 20; i++) {
        const allowed = await service.checkUpdateRateLimit(userId)
        expect(allowed).toBe(true)
      }
    })

    it('blocks the 21st call', async () => {
      for (let i = 0; i < 20; i++) {
        await service.checkUpdateRateLimit(userId)
      }
      const allowed = await service.checkUpdateRateLimit(userId)
      expect(allowed).toBe(false)
    })

    it('sets TTL of 900s on first increment', async () => {
      await service.checkUpdateRateLimit(userId)
      const ttl = redis.getTtl(`chef:rate-limit:${userId}:update`)
      expect(ttl).toBe(900)
    })
  })

  // ── Parse error handling ─────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null when cached data is invalid JSON', async () => {
      // Set corrupted data directly
      await redis.set(`chef:badchef:profile`, 'not-valid-json')
      const result = await service.getProfile('badchef')
      expect(result).toBeNull()
    })
  })
})
