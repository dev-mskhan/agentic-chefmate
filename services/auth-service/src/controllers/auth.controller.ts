import type { Request, Response } from "express";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_MS,
  buildCookieOptions,
  verifyAccessToken,
} from "@platform/shared-auth";
import { UnauthorizedError, ValidationError } from "@platform/shared-types";
import type { AuthContainer } from "../container.js";
import { hashRefreshToken } from "../services/session.service.js";
import { googleCallbackQuerySchema } from "../validators/auth.validators.js";

export interface AuthController {
  googleLogin: (req: Request, res: Response) => Promise<void>;
  googleCallback: (req: Request, res: Response) => Promise<void>;
  refresh: (req: Request, res: Response) => Promise<void>;
  logout: (req: Request, res: Response) => Promise<void>;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function sessionMeta(req: Request): { ip: string; userAgent?: string } {
  return { ip: clientIp(req), userAgent: req.get("user-agent") };
}

/**
 * Thin controllers: validate input, call services, set cookies, respond or
 * redirect. No business logic lives here.
 */
export function createAuthController(container: AuthContainer): AuthController {
  const isProduction = process.env.NODE_ENV === "production";

  function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE_MS, isProduction));
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, buildCookieOptions(REFRESH_TOKEN_MAX_AGE_MS, isProduction));
  }

  function clearAuthCookies(res: Response): void {
    const opts = { httpOnly: true, secure: isProduction, sameSite: "lax" as const, path: "/" };
    res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
    res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
  }

  return {
    async googleLogin(_req, res) {
      res.redirect(container.googleOAuthService.getConsentUrl());
    },

    async googleCallback(req, res) {
      await container.rateLimiters.googleCallback.consume(clientIp(req));

      const parsed = googleCallbackQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError("Invalid Google callback query", parsed.error.flatten());
      }
      const { code } = parsed.data;

      const profile = await container.googleOAuthService.exchangeCode(code);
      const { user } = await container.userService.findOrCreateFromGoogleProfile(profile);

      const { accessToken, refreshToken, sessionId } = await container.tokenService.issueTokenPair(
        { sub: user.id, email: user.email, role: user.role },
        sessionMeta(req),
      );

      setAuthCookies(res, accessToken, refreshToken);

      await container.pubsubService.publish({
        type: "login",
        userId: user.id,
        sessionId,
        timestamp: Date.now(),
      });
      await container.auditLogProducer.publish({
        userId: user.id,
        eventType: "login",
        ip: clientIp(req),
        userAgent: req.get("user-agent"),
        timestamp: Date.now(),
      });

      res.redirect(container.config.CLIENT_APP_URL);
    },

    async refresh(req, res) {
      await container.rateLimiters.refresh.consume(clientIp(req));

      const refreshToken = req.signedCookies?.[REFRESH_TOKEN_COOKIE];
      if (!refreshToken || typeof refreshToken !== "string") {
        throw new UnauthorizedError("Missing refresh token");
      }

      const result = await container.tokenService.rotateRefreshToken(refreshToken, sessionMeta(req));
      setAuthCookies(res, result.accessToken, result.refreshToken);

      await container.auditLogProducer.publish({
        userId: result.userId,
        eventType: "refresh",
        ip: clientIp(req),
        userAgent: req.get("user-agent"),
        timestamp: Date.now(),
      });

      res.json({ success: true, data: { ok: true } });
    },

    async logout(req, res) {
      const refreshToken = req.signedCookies?.[REFRESH_TOKEN_COOKIE];
      let sessionId: string | undefined;

      if (typeof refreshToken === "string") {
        sessionId =
          (await container.sessionService.findSessionIdByRefreshTokenHash(
            hashRefreshToken(refreshToken),
          )) ?? undefined;
      }

      // Fall back to the access token's session claim if no valid refresh token.
      const accessToken = req.signedCookies?.[ACCESS_TOKEN_COOKIE];
      if (!sessionId && typeof accessToken === "string") {
        try {
          sessionId = (await verifyAccessToken(accessToken, container.jwtPublicKey)).sessionId;
        } catch {
          /* ignore — nothing to revoke if both tokens are invalid */
        }
      }

      if (sessionId) {
        const session = await container.sessionService.findBySessionId(sessionId);
        const userId = session?.userId;
        if (userId) {
          await container.sessionService.revoke(sessionId, userId);
          await container.cacheService.invalidateProfile(userId);
          await container.pubsubService.publish({
            type: "logout",
            userId,
            sessionId,
            timestamp: Date.now(),
          });
          await container.auditLogProducer.publish({
            userId,
            eventType: "logout",
            ip: clientIp(req),
            userAgent: req.get("user-agent"),
            timestamp: Date.now(),
          });
        }
      }

      clearAuthCookies(res);
      res.json({ success: true, data: { ok: true } });
    },
  };
}
