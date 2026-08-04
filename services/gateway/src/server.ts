import http from "node:http";
import { createLogger } from "@platform/logger";
import { createApp } from "./app.js";
import { loadGatewayEnv } from "./config/env.js";
import { createRedisClient } from "./redis/client.js";

async function main(): Promise<void> {
  const config = loadGatewayEnv();
  const logger = createLogger({ serviceName: "gateway" });

  const redis = createRedisClient(config.REDIS_URL, logger);
  await redis.connect();

  const app = createApp({ config, logger, redis });
  const server = http.createServer(app);

  const port = config.PORT;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });
  logger.info({ port }, "gateway listening");

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");

    server.close(() => {
      void (async () => {
        try {
          await redis.quit();
          logger.info("Graceful shutdown complete");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during shutdown");
          process.exit(1);
        }
      })();
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("gateway failed to start", err);
  process.exit(1);
});
