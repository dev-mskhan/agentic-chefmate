import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createYoga } from "graphql-yoga";
import type { Logger } from "@platform/logger";
import type { GatewayConfig } from "./config/env.js";
import { schema } from "./graphql/schema.js";
import { buildContext } from "./graphql/context.js";
import { createAuthTrpcClient } from "./clients/auth-trpc-client.js";
import { createAuthProxyRoutes } from "./rest/auth-proxy.routes.js";
import { createGraphqlRateLimiter, graphqlRateLimitMiddleware } from "./middleware/rate-limit.middleware.js";
import type { Redis } from "ioredis";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface AppDeps {
  config: GatewayConfig;
  logger: Logger;
  redis: Redis;
}

export function createApp({ config, logger, redis }: AppDeps): express.Express {
  const authClient = createAuthTrpcClient(config.AUTH_SERVICE_URL);
  const rateLimiter = createGraphqlRateLimiter(redis);

  const yoga = createYoga({
    schema,
    context: ({ request }: { request: IncomingMessage & { res?: ServerResponse } }) =>
      buildContext(
        request,
        request.res ?? ({} as ServerResponse),
        authClient,
        config.JWT_PUBLIC_KEY,
        config.AUTH_SERVICE_URL,
        logger,
      ),
    graphqlEndpoint: "/graphql",
  });

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin: config.CLIENT_APP_URL,
      credentials: true,
    }),
  );

  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(express.json());

  app.use("/api/v1/auth", createAuthProxyRoutes(config.AUTH_SERVICE_URL));

  app.use("/graphql", async (req, res, next) => {
    try {
      const ip =
        typeof req.headers["x-forwarded-for"] === "string"
          ? req.headers["x-forwarded-for"].split(",")[0]!.trim()
          : req.socket.remoteAddress ?? "127.0.0.1";
      await graphqlRateLimitMiddleware(rateLimiter, ip);
    } catch (err) {
      next(err);
      return;
    }
    // graphql-yoga needs access to the raw ServerResponse to relay Set-Cookie headers
    (req as any).res = res;
    return yoga.handle(req as any, res as any);
  });

  return app;
}
