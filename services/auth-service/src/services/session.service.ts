import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import type { Logger } from "@platform/logger";
import { REFRESH_TOKEN_TTL_DAYS } from "@platform/shared-auth";

const SESSION_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

/**
 * The source of truth for an active session. NOT stored in Mongo — Redis only.
 * The raw refresh token is never stored; only its SHA-256 hash (same treatment
 * as a password). The `refresh-token:{hash}` key is a secondary index so a
 * refresh (which only has the opaque token) can find its sessionId.
 */
export interface SessionRecord {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: number;
}

export interface SessionService {
  createSession(record: SessionRecord): Promise<void>;
  findBySessionId(sessionId: string): Promise<SessionRecord | null>;
  findSessionIdByRefreshTokenHash(hash: string): Promise<string | null>;
  listByUserId(userId: string): Promise<SessionRecord[]>;
  revoke(sessionId: string, userId: string): Promise<void>;
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function tokenIndexKey(hash: string): string {
  return `refresh-token:${hash}`;
}

function userSessionsKey(userId: string): string {
  return `user-sessions:${userId}`;
}

export function createSessionService(redis: Redis, logger: Logger): SessionService {
  return {
    async createSession(record) {
      await redis.set(sessionKey(record.sessionId), JSON.stringify(record), "EX", SESSION_TTL_SECONDS);
      await redis.set(tokenIndexKey(record.refreshTokenHash), record.sessionId, "EX", SESSION_TTL_SECONDS);
      await redis.sadd(userSessionsKey(record.userId), record.sessionId);
    },

    async findBySessionId(sessionId) {
      const raw = await redis.get(sessionKey(sessionId));
      return raw ? (JSON.parse(raw) as SessionRecord) : null;
    },

    async findSessionIdByRefreshTokenHash(hash) {
      return redis.get(tokenIndexKey(hash));
    },

    async listByUserId(userId) {
      const ids = await redis.smembers(userSessionsKey(userId));
      if (ids.length === 0) return [];
      const raws = await redis.mget(...ids.map((id) => sessionKey(id)));
      const sessions: SessionRecord[] = [];
      for (let i = 0; i < ids.length; i += 1) {
        const raw = raws[i];
        const id = ids[i];
        if (raw && id) {
          sessions.push(JSON.parse(raw) as SessionRecord);
        }
      }
      return sessions;
    },

    async revoke(sessionId, userId) {
      const raw = await redis.get(sessionKey(sessionId));
      const existing = raw ? (JSON.parse(raw) as SessionRecord) : null;
      await redis.del(sessionKey(sessionId));
      if (existing?.refreshTokenHash) {
        await redis.del(tokenIndexKey(existing.refreshTokenHash));
      }
      await redis.srem(userSessionsKey(userId), sessionId);
      logger.debug({ sessionId, userId }, "Session revoked");
    },
  };
}
