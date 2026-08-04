import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createHttpLogger } from "@platform/logger";
import type { AuthContainer } from "./container.js";
import type { AuthEnv } from "./config/env.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createErrorHandler } from "./middleware/error-handler.middleware.js";
import { createV1Router } from "./routes/index.js";
import { createTrpcContextFactory } from "./trpc/context.js";
import { createAppRouter } from "./trpc/routers/index.js";

export interface AppDeps {
  container: AuthContainer;
  config: AuthEnv;
}

export function createApp(deps: AppDeps): Express {
  const { container, config } = deps;
  const app = express();

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_APP_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(createHttpLogger({ serviceName: "auth-service" }).httpLogger);

  // REST — cookie-writing lives here and only here.
  app.use("/api/v1", createV1Router(createAuthController(container)));

  // tRPC — typed calls, no cookie-writing (§4.1).
  app.use(
    "/api/v1/trpc",
    createExpressMiddleware({
      router: createAppRouter(container),
      createContext: createTrpcContextFactory(container, config.JWT_PUBLIC_KEY),
    }),
  );

  app.use(createErrorHandler(container.logger));
  return app;
}
