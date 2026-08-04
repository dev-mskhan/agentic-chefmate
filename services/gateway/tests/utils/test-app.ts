import type { Express } from "express";
import RedisMock from "ioredis-mock";
import { createApp } from "../../src/app.js";
import { TEST_JWT_PUBLIC_KEY } from "./fixtures";

export interface TestGatewayApp {
  app: Express;
  redis: any;
  close: () => Promise<void>;
}

const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
} as any;

export async function createTestGatewayApp(): Promise<TestGatewayApp> {
  const redis = new RedisMock() as any;

  const config = {
    NODE_ENV: "test" as const,
    PORT: 4000,
    LOG_LEVEL: "silent" as const,
    REDIS_URL: "redis://localhost:6379",
    JWT_PUBLIC_KEY: TEST_JWT_PUBLIC_KEY,
    COOKIE_SECRET: "test-cookie-secret",
    AUTH_SERVICE_URL: "http://localhost:3000",
    CLIENT_APP_URL: "http://localhost:5173",
  };

  const app = createApp({ config: config as any, logger: mockLogger, redis });

  return {
    app,
    redis,
    close: async () => {
      redis.disconnect?.();
    },
  };
}
