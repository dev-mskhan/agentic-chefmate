import type Redis from 'ioredis'

// ─── Cache value interfaces ───────────────────────────────────────────────────

export interface ProfileCache {
  userId: string
  firstName: string
  lastName: string
  phone?: string
  profileImage?: string
  dateOfBirth?: string
}

export interface PreferencesCache {
  dietaryPreferences: string[]
  allergies: string[]
  dislikedIngredients: string[]
  spiceLevel: string
  favoriteCuisines: string[]
}

export interface AddressCache {
  _id: string
  label: string
  addressLine: string
  city: string
  postalCode?: string
  coordinates?: { lat: number; lng: number }
  deliveryInstructions?: string
  isDefault: boolean
}

export interface FavoritesCache {
  chefIds: string[]
  dishIds: string[]
  planIds: string[]
}

// ─── TTL constants ────────────────────────────────────────────────────────────

const PROFILE_TTL     = 900    // 15 min
const PREFERENCES_TTL = 1800   // 30 min
const ADDRESSES_TTL   = 600    // 10 min
const FAVORITES_TTL   = 900    // 15 min
const EXPORT_TTL      = 3600   // 60 min (rate limit window)
const EXPORT_MAX      = 1

// ─── Key builders ─────────────────────────────────────────────────────────────

const keys = {
  profile:     (userId: string) => `user:${userId}:profile`,
  preferences: (userId: string) => `user:${userId}:preferences`,
  addresses:   (userId: string) => `user:${userId}:addresses`,
  favorites:   (userId: string) => `user:${userId}:favorites`,
  exportLimit: (userId: string) => `user:rate-limit:${userId}:export`,
}

// ─── RedisCacheService ────────────────────────────────────────────────────────

export class RedisCacheService {
  constructor(private readonly redis: Redis) {}

  // ── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<ProfileCache | null> {
    return this.getJson<ProfileCache>(keys.profile(userId))
  }

  async setProfile(userId: string, data: ProfileCache): Promise<void> {
    await this.setJson(keys.profile(userId), data, PROFILE_TTL)
  }

  async invalidateProfile(userId: string): Promise<void> {
    await this.redis.del(keys.profile(userId))
  }

  // ── Preferences ─────────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<PreferencesCache | null> {
    return this.getJson<PreferencesCache>(keys.preferences(userId))
  }

  async setPreferences(userId: string, data: PreferencesCache): Promise<void> {
    await this.setJson(keys.preferences(userId), data, PREFERENCES_TTL)
  }

  async invalidatePreferences(userId: string): Promise<void> {
    await this.redis.del(keys.preferences(userId))
  }

  // ── Addresses ───────────────────────────────────────────────────────────────

  async getAddresses(userId: string): Promise<AddressCache[] | null> {
    return this.getJson<AddressCache[]>(keys.addresses(userId))
  }

  async setAddresses(userId: string, data: AddressCache[]): Promise<void> {
    await this.setJson(keys.addresses(userId), data, ADDRESSES_TTL)
  }

  async invalidateAddresses(userId: string): Promise<void> {
    await this.redis.del(keys.addresses(userId))
  }

  // ── Favorites ───────────────────────────────────────────────────────────────

  async getFavorites(userId: string): Promise<FavoritesCache | null> {
    return this.getJson<FavoritesCache>(keys.favorites(userId))
  }

  async setFavorites(userId: string, data: FavoritesCache): Promise<void> {
    await this.setJson(keys.favorites(userId), data, FAVORITES_TTL)
  }

  async invalidateFavorites(userId: string): Promise<void> {
    await this.redis.del(keys.favorites(userId))
  }

  // ── Invalidate all ──────────────────────────────────────────────────────────

  async invalidateAll(userId: string): Promise<void> {
    const pipeline = this.redis.pipeline()
    pipeline.del(keys.profile(userId))
    pipeline.del(keys.preferences(userId))
    pipeline.del(keys.addresses(userId))
    pipeline.del(keys.favorites(userId))
    await pipeline.exec()
  }

  // ── Export rate limit ───────────────────────────────────────────────────────

  /**
   * Returns true if the export is allowed (under the limit).
   * Uses INCR + EXPIRE pattern. First call sets TTL; subsequent calls only INCR.
   */
  async checkExportRateLimit(userId: string): Promise<boolean> {
    const key = keys.exportLimit(userId)
    const count = await this.redis.incr(key)
    if (count === 1) {
      // First increment — set the expiry window
      await this.redis.expire(key, EXPORT_TTL)
    }
    return count <= EXPORT_MAX
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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
