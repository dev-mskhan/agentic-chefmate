import type { Express } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import RedisMock from "ioredis-mock";
import mongoose from "mongoose";
import { createApp, type AppDeps } from "../../src/app.js";
import { buildContainer } from "../../src/container.js";
import { initModels } from "../../src/models/index.js";
import type { AuditLogProducer, WelcomeEmailProducer } from "../../src/queue/producers/index.js";
import type { Logger } from "@platform/logger";
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from "./fixtures";

export interface TestApp {
  app: Express;
  mongo: MongoMemoryServer;
  redis: RedisMock;
  close: () => Promise<void>;
}

/**
 * Builds the Express app in test mode: in-memory Mongo, ioredis-mock,
 * no real port binding, no real RabbitMQ.
 */
export async function createTestApp(logger?: Logger): Promise<TestApp> {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
  initModels(mongoose.connection);

  const redis = new RedisMock() as any;

  const mockWelcomeEmailProducer: WelcomeEmailProducer = {
    publish: async () => {},
  };
  const mockAuditLogProducer: AuditLogProducer = {
    publish: async () => {},
  };

  const config = {
    NODE_ENV: "test" as const,
    PORT: 3000,
    LOG_LEVEL: "silent" as const,
    MONGODB_URI: uri,
    MONGODB_DB_NAME: "test",
    REDIS_URL: "redis://localhost:6379",
    RABBITMQ_URL: "amqp://localhost:5672",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback",
    JWT_PRIVATE_KEY: TEST_JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY: TEST_JWT_PUBLIC_KEY,
    COOKIE_SECRET: "test-cookie-secret",
    CLIENT_APP_URL: "http://localhost:5173",
  };

  const testLogger = logger ?? ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => testLogger,
  } as any);

  const container = buildContainer({
    config: config as any,
    logger: testLogger,
    redis,
    welcomeEmailProducer: mockWelcomeEmailProducer,
    auditLogProducer: mockAuditLogProducer,
    rateLimitDisabled: true,
  });

  const app = createApp({ container, config: config as any });

  return {
    app,
    mongo,
    redis,
    close: async () => {
      await mongoose.disconnect();
      await mongo.stop();
      redis.disconnect?.();
    },
  };
}
