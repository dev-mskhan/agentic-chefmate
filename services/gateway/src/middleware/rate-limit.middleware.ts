import type { Redis } from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { RateLimitError } from "@platform/shared-types";

export function createGraphqlRateLimiter(redis: Redis): RateLimiterRedis {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:gw:graphql",
    points: 100,
    duration: 60,
  });
}

export async function graphqlRateLimitMiddleware(
  limiter: RateLimiterRedis,
  ip: string,
): Promise<void> {
  try {
    await limiter.consume(ip);
  } catch {
    throw new RateLimitError("Rate limit exceeded. Try again later.");
  }
}
