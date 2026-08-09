import type Redis from 'ioredis'
import type { IChefProfile } from '../models/chef-profile.model'

// ─── TTL constants ────────────────────────────────────────────────────────────

const PROFILE_TTL      = 600   // 10 min
const USER_CHEF_ID_TTL = 1800  // 30 min
const RATE_LIMIT_TTL   = 900   // 15 min
const RATE_LIMIT_MAX   = 20

// ─── Key builders ─────────────────────────────────────────────────────────────

const keys = {
  profile:     (chefId: string) => `chef:${chefId}:profile`,
  userChefId:  (userId: string) => `chef:${userId}:id`,
  rateLimit:   (userId: string) => `chef:rate-limit:${userId}:update`,
}

// ─── RedisCacheService ────────────────────────────────────────────────────────

export class RedisCacheService {
  constructor(private readonly redis: Redis) {}

  // ── Profile cache ────────────────────────────────────────────────────────────

  async getProfile(chefId: string): Promise<IChefProfile | null> {
    return this.getJson<IChefProfile>(keys.profile(chefId))
  }

  async setProfile(chefId: string, data: IChefProfile): Promise<void> {
    await this.setJson(keys.profile(chefId), data, PROFILE_TTL)
  }

  async invalidateProfile(chefId: string): Promise<void> {
    await this.redis.del(keys.profile(chefId))
  }

  // ── userId → chefId mapping ──────────────────────────────────────────────────

  async getUserChefId(userId: string): Promise<string | null> {
    try {
      const raw = await this.redis.get(keys.userChefId(userId))
      return raw ?? null
    } catch {
      return null
    }
  }

  async setUserChefId(userId: string, chefId: string): Promise<void> {
    await this.redis.set(keys.userChefId(userId), chefId, 'EX', USER_CHEF_ID_TTL)
  }

  async invalidateUserChefId(userId: string): Promise<void> {
    await this.redis.del(keys.userChefId(userId))
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────

  /**
   * Returns true if the update is allowed (under the limit).
   * Uses INCR + EXPIRE pattern. First call sets TTL; subsequent calls only INCR.
   */
  async checkUpdateRateLimit(userId: string): Promise<boolean> {
    const key = keys.rateLimit(userId)
    const count = await this.redis.incr(key)
    if (count === 1) {
      // First increment — set the expiry window
      await this.redis.expire(key, RATE_LIMIT_TTL)
    }
    return count <= RATE_LIMIT_MAX
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  private async setJson(key: string, data: unknown, ttl: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(data), 'EX', ttl)
  }
}
