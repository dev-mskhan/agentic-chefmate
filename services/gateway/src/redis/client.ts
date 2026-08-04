import { Redis } from "ioredis";
import type { Logger } from "@platform/logger";

export function createRedisClient(redisUrl: string, logger: Logger): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });

  client.on("ready", () => {
    logger.info("Redis connected");
  });

  return client;
}
