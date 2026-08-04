import { Redis } from "ioredis";
import type { Logger } from "@platform/logger";

/**
 * Creates the process-wide Redis client. auth-service runs against REDIS_URL
 * from the env schema; the same factory is used by tests with a mock client
 * injected into the container instead.
 */
export function createRedisClient(url: string, logger: Logger): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  client.on("error", (err) => logger.error({ err }, "Redis connection error"));
  return client;
}
