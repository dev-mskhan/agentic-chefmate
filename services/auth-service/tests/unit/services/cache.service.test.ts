import RedisMock from "ioredis-mock";
import { createCacheService } from "../../../src/services/cache.service";

describe("CacheService", () => {
  let redis: any;
  let cache: ReturnType<typeof createCacheService>;

  beforeEach(() => {
    redis = new RedisMock() as any;
    cache = createCacheService(redis);
  });

  describe("getProfile / setProfile", () => {
    it("returns null on cache miss", async () => {
      const result = await cache.getProfile("user-1");
      expect(result).toBeNull();
    });

    it("returns cached profile after set", async () => {
      const profile = { id: "user-1", name: "Alice" };
      await cache.setProfile("user-1", profile);

      const result = await cache.getProfile("user-1");
      expect(result).toEqual(profile);
    });
  });

  describe("invalidateProfile", () => {
    it("removes the cached profile", async () => {
      await cache.setProfile("user-1", { id: "user-1", name: "Alice" });
      await cache.invalidateProfile("user-1");

      const result = await cache.getProfile("user-1");
      expect(result).toBeNull();
    });

    it("is safe to call on a non-existent key", async () => {
      await expect(cache.invalidateProfile("nonexistent")).resolves.toBeUndefined();
    });
  });
});
