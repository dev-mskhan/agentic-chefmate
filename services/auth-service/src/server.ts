import http from "node:http";
import type { Connection } from "mongoose";
import type { Redis } from "ioredis";
import { createLogger } from "@platform/logger";
import { connectDb } from "@platform/shared-types";
import { createApp } from "./app.js";
import { loadAuthEnv } from "./config/env.js";
import { buildContainer } from "./container.js";
import { initModels } from "./models/index.js";
import { startAuditLogConsumer } from "./queue/consumers/audit-log.consumer.js";
import { startWelcomeEmailConsumer } from "./queue/consumers/welcome-email.consumer.js";
import { createAuditLogProducer } from "./queue/producers/audit-log.producer.js";
import { createWelcomeEmailProducer } from "./queue/producers/welcome-email.producer.js";
import { connectRabbitMq } from "./queue/rabbitmq.client.js";
import { createRedisClient } from "./redis/client.js";

export type { AppRouter } from "./trpc/routers/index.js";

async function main(): Promise<void> {
  const config = loadAuthEnv();
  const logger = createLogger({ serviceName: "auth-service" });

  const db: Connection = await connectDb({
    uri: config.MONGODB_URI,
    dbName: config.MONGODB_DB_NAME,
    serviceName: "auth-service",
    logger,
  });
  initModels(db);

  const redis: Redis = createRedisClient(config.REDIS_URL, logger);
  await redis.connect();

  const rabbit = await connectRabbitMq(config.RABBITMQ_URL, logger);
  const welcomeEmailProducer = createWelcomeEmailProducer(rabbit, logger);
  const auditLogProducer = createAuditLogProducer(rabbit, logger);

  const container = buildContainer({
    config,
    logger,
    redis,
    welcomeEmailProducer,
    auditLogProducer,
  });

  await startWelcomeEmailConsumer(rabbit, {
    emailService: container.emailService,
    logger,
  });
  await startAuditLogConsumer(rabbit, {
    auditService: container.auditService,
    logger,
  });

  const app = createApp({ container, config });
  const server = http.createServer(app);

  const port = config.PORT;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });
  logger.info({ port }, "auth-service listening");

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");

    // Stop accepting new requests first; then close infra in dependency order.
    server.close(() => {
      void (async () => {
        try {
          await rabbit.close();
          await redis.quit();
          await db.close().catch(() => undefined);
          logger.info("Graceful shutdown complete");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during shutdown");
          process.exit(1);
        }
      })();
    });
    // Never hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("auth-service failed to start", err);
  process.exit(1);
});
