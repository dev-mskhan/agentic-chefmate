import type { Redis } from "ioredis";

const PROFILE_CACHE_TTL_SECONDS = 5 * 60;
const profileKey = (userId: string) => `cache:user:${userId}`;

export interface UserProfileCache {
  getProfile<T>(userId: string): Promise<T | null>;
  setProfile<T>(userId: string, profile: T): Promise<void>;
  invalidateProfile(userId: string): Promise<void>;
}

/**
 * Cache-aside with EXPLICIT active invalidation — not TTL-only. We DEL the
 * profile key on any user update and on logout, so stale data never lingers
 * until the 5-minute TTL backstop expires. The short TTL is a safety net for
 * orphaned keys (e.g. a crash between a write and its matching DEL).
 */
export function createCacheService(redis: Redis): UserProfileCache {
  return {
    async getProfile<T>(userId: string): Promise<T | null> {
      const raw = await redis.get(profileKey(userId));
      return raw ? (JSON.parse(raw) as T) : null;
    },

    async setProfile<T>(userId: string, profile: T): Promise<void> {
      await redis.set(profileKey(userId), JSON.stringify(profile), "EX", PROFILE_CACHE_TTL_SECONDS);
    },

    async invalidateProfile(userId: string): Promise<void> {
      await redis.del(profileKey(userId));
    },
  };
}
