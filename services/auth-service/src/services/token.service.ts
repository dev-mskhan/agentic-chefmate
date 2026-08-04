import { randomBytes, randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import { signAccessToken, type UserRole } from "@platform/shared-auth";
import { UnauthorizedError } from "@platform/shared-types";
import { hashRefreshToken, type SessionService } from "./session.service.js";

export interface TokenUserClaims {
  sub: string;
  email: string;
  role: UserRole;
}

export interface TokenIssueResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface TokenService {
  issueTokenPair(claims: TokenUserClaims, meta: SessionMeta): Promise<TokenIssueResult>;
  rotateRefreshToken(
    oldRefreshToken: string,
    meta: SessionMeta,
  ): Promise<TokenIssueResult & { userId: string }>;
}

export function createTokenService(deps: {
  redis: Redis;
  sessionService: SessionService;
  jwtPrivateKey: string;
  /** Loads the current claims for a user — used during refresh, when the
   *  access token (and thus email/role) may already be expired. */
  getUserClaims: (userId: string) => Promise<TokenUserClaims>;
}): TokenService {
  const { redis, sessionService, jwtPrivateKey, getUserClaims } = deps;

  return {
    async issueTokenPair(claims, meta) {
      const sessionId = randomUUID();
      const refreshToken = randomBytes(48).toString("hex");
      const refreshTokenHash = hashRefreshToken(refreshToken);

      await sessionService.createSession({
        sessionId,
        userId: claims.sub,
        refreshTokenHash,
        userAgent: meta.userAgent,
        ip: meta.ip,
        createdAt: Date.now(),
      });

      const accessToken = await signAccessToken({ ...claims, sessionId }, jwtPrivateKey);
      return { accessToken, refreshToken, sessionId };
    },

    async rotateRefreshToken(oldRefreshToken, meta) {
      const oldHash = hashRefreshToken(oldRefreshToken);
      const sessionId = await sessionService.findSessionIdByRefreshTokenHash(oldHash);
      if (!sessionId) throw new UnauthorizedError("Invalid refresh token");

      const session = await sessionService.findBySessionId(sessionId);
      // Reject if the session is gone OR the hash no longer matches — the
      // latter is how token reuse is detected after a rotation.
      if (!session || session.refreshTokenHash !== oldHash) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      const newRefreshToken = randomBytes(48).toString("hex");
      const newHash = hashRefreshToken(newRefreshToken);

      await sessionService.createSession({
        sessionId,
        userId: session.userId,
        refreshTokenHash: newHash,
        userAgent: meta.userAgent ?? session.userAgent,
        ip: meta.ip ?? session.ip,
        createdAt: session.createdAt,
      });
      // Drop the old token's index — the old refresh token no longer works.
      await redis.del(`refresh-token:${oldHash}`);

      const claims = await getUserClaims(session.userId);
      const accessToken = await signAccessToken({ ...claims, sessionId }, jwtPrivateKey);
      return { accessToken, refreshToken: newRefreshToken, sessionId, userId: session.userId };
    },
  };
}
