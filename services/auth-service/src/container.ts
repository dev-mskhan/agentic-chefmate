import type { Logger } from "@platform/logger";
import type { Redis } from "ioredis";
import { UnauthorizedError } from "@platform/shared-types";
import type { AuthEnv } from "./config/env.js";
import { createCacheService } from "./services/cache.service.js";
import { createSessionService, type SessionService } from "./services/session.service.js";
import { createTokenService, type TokenService } from "./services/token.service.js";
import { createUserService, type UserService } from "./services/user.service.js";
import {
  createGoogleOauthService,
  type GoogleOAuthService,
} from "./services/google-oauth.service.js";
import { createPubsubService, type PubSubService } from "./services/pubsub.service.js";
import { createRateLimiters, type RateLimiters } from "./services/rate-limit.service.js";
import { createEmailService, type EmailService } from "./services/email.service.js";
import { createAuditService, type AuditService } from "./services/audit.service.js";
import type { AuditLogProducer, WelcomeEmailProducer } from "./queue/producers/index.js";

export interface AuthContainer {
  config: AuthEnv;
  logger: Logger;
  jwtPrivateKey: string;
  jwtPublicKey: string;
  googleOAuthService: GoogleOAuthService;
  userService: UserService;
  tokenService: TokenService;
  sessionService: SessionService;
  cacheService: ReturnType<typeof createCacheService>;
  rateLimiters: RateLimiters;
  pubsubService: PubSubService;
  emailService: EmailService;
  auditService: AuditService;
  welcomeEmailProducer: WelcomeEmailProducer;
  auditLogProducer: AuditLogProducer;
}

export interface BuildContainerOptions {
  config: AuthEnv;
  logger: Logger;
  redis: Redis;
  welcomeEmailProducer: WelcomeEmailProducer;
  auditLogProducer: AuditLogProducer;
  /** Tests bypass the real Redis-backed rate limiters. */
  rateLimitDisabled?: boolean;
}

/**
 * Wires every service together. server.ts and test-app.ts both build this so
 * the two never drift on how dependencies are assembled.
 */
export function buildContainer(opts: BuildContainerOptions): AuthContainer {
  const { config, logger, redis } = opts;

  const sessionService = createSessionService(redis, logger);
  const cacheService = createCacheService(redis);
  const userService = createUserService({
    cache: cacheService,
    welcomeEmailProducer: opts.welcomeEmailProducer,
    logger,
  });
  const tokenService = createTokenService({
    redis,
    sessionService,
    jwtPrivateKey: config.JWT_PRIVATE_KEY,
    getUserClaims: async (userId) => {
      const user = await userService.findById(userId);
      if (!user) {
        throw new UnauthorizedError("User no longer exists");
      }
      return { sub: user.id, email: user.email, role: user.role };
    },
  });

  return {
    config,
    logger,
    jwtPrivateKey: config.JWT_PRIVATE_KEY,
    jwtPublicKey: config.JWT_PUBLIC_KEY,
    googleOAuthService: createGoogleOauthService(config),
    userService,
    tokenService,
    sessionService,
    cacheService,
    rateLimiters: createRateLimiters(redis, { disabled: opts.rateLimitDisabled }),
    pubsubService: createPubsubService(redis, logger),
    emailService: createEmailService(logger),
    auditService: createAuditService(logger),
    welcomeEmailProducer: opts.welcomeEmailProducer,
    auditLogProducer: opts.auditLogProducer,
  };
}
