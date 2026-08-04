import type { Redis } from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { RateLimitError } from "@platform/shared-types";

export interface RateLimiter {
  consume(key: string): Promise<void>;
}

export interface RateLimiters {
  googleCallback: RateLimiter;
  refresh: RateLimiter;
}

function createRateLimiter(
  redis: Redis,
  points: number,
  durationSeconds: number,
  keyPrefix: string,
): RateLimiter {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points,
    duration: durationSeconds,
    blockDuration: durationSeconds,
  });

  return {
    async consume(key) {
      try {
        await limiter.consume(key);
      } catch {
        throw new RateLimitError("Too many requests");
      }
    },
  };
}

/**
 * Endpoint-specific limits (§4.4.3):
 *   - Google callback: 5 req/60s per IP
 *   - refresh:         10 req/60s per IP
 * Keys are the client IP so limits follow the real client, not the gateway.
 */
export function createRateLimiters(redis: Redis, options: { disabled?: boolean } = {}): RateLimiters {
  if (options.disabled) {
    const noop: RateLimiter = {
      async consume() {
        /* no-op — tests bypass rate limiting */
      },
    };
    return { googleCallback: noop, refresh: noop };
  }
  return {
    googleCallback: createRateLimiter(redis, 5, 60, "rl:google-callback"),
    refresh: createRateLimiter(redis, 10, 60, "rl:refresh"),
  };
}
