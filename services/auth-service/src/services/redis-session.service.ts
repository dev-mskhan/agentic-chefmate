import type { Redis } from 'ioredis'
import crypto from 'crypto'

// ─── TTLs (seconds) ────────────────────────────────────────────────────────
export const SESSION_TTL = 7 * 24 * 60 * 60       // 7 days — matches refresh-token lifetime
export const EMAIL_VERIFY_TTL = 20 * 60            // 20 minutes
export const PASSWORD_RESET_TTL = 10 * 60          // 10 minutes
export const OTP_TTL = 5 * 60                      // 5 minutes
export const RATE_LIMIT_LOGIN_TTL = 15 * 60        // 15-minute sliding window
export const RATE_LIMIT_MAX_ATTEMPTS = 10          // requests per window

// ─── Key builders ──────────────────────────────────────────────────────────
export const sessionKey = (sessionId: string) => `auth:session:${sessionId}`
export const emailVerifyKey = (tokenHash: string) => `auth:email-verification:${tokenHash}`
export const passwordResetKey = (tokenHash: string) => `auth:password-reset:${tokenHash}`
export const rateLimitIpKey = (ip: string) => `auth:rate-limit:login:${ip}`
export const rateLimitUserKey = (userId: string) => `auth:rate-limit:login:user:${userId}`
export const otpKey = (userId: string) => `auth:otp:${userId}`

// ─── Session payload stored in Redis ───────────────────────────────────────
export interface SessionData {
  userId: string
  refreshTokenHash: string
  /** raw device/UA metadata — kept small */
  device?: string
  ip?: string
  userAgent?: string
  /** Unix timestamp (seconds) */
  expiresAt: number
}

// ─── Session CRUD ──────────────────────────────────────────────────────────

/**
 * Persist a session in Redis.
 * Key: auth:session:{sessionId}
 * TTL matches refresh-token lifetime.
 */
export async function createSession(
  redis: Redis,
  sessionId: string,
  data: SessionData,
): Promise<void> {
  await redis.set(sessionKey(sessionId), JSON.stringify(data), 'EX', SESSION_TTL)
}

export async function getSession(
  redis: Redis,
  sessionId: string,
): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(sessionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

export async function deleteSession(redis: Redis, sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId))
}

// ─── Email-verification token ──────────────────────────────────────────────

/**
 * Store a one-time email verification token.
 * Key: auth:email-verification:{sha256(rawToken)}
 * Value: userId
 */
export async function createEmailVerificationToken(
  redis: Redis,
  userId: string,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  await redis.set(emailVerifyKey(hash), userId, 'EX', EMAIL_VERIFY_TTL)
  return rawToken
}

export async function consumeEmailVerificationToken(
  redis: Redis,
  rawToken: string,
): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const userId = await redis.get(emailVerifyKey(hash))
  if (!userId) return null
  await redis.del(emailVerifyKey(hash))
  return userId
}

// ─── Password-reset token ──────────────────────────────────────────────────

/**
 * Store a one-time password reset token.
 * Key: auth:password-reset:{sha256(rawToken)}
 * Value: userId
 */
export async function createPasswordResetToken(
  redis: Redis,
  userId: string,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  await redis.set(passwordResetKey(hash), userId, 'EX', PASSWORD_RESET_TTL)
  return rawToken
}

export async function consumePasswordResetToken(
  redis: Redis,
  rawToken: string,
): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const userId = await redis.get(passwordResetKey(hash))
  if (!userId) return null
  await redis.del(passwordResetKey(hash))
  return userId
}

/** Invalidate any existing password-reset token for a user by scanning.
 *  Because we only store {hash → userId} we can't reverse-lookup efficiently,
 *  so callers should just let the old token expire (10 min TTL).
 *  This helper is a no-op placeholder in case you add a reverse index later. */
export async function invalidatePasswordResetTokens(
  _redis: Redis,
  _userId: string,
): Promise<void> {
  // Intentionally a no-op — TTL ensures automatic expiry.
  // Add a reverse-index if you need instant invalidation.
}

// ─── Rate limiting ─────────────────────────────────────────────────────────

/**
 * Increment the login attempt counter for an IP or userId.
 * Returns the updated attempt count.
 */
export async function incrementRateLimit(
  redis: Redis,
  key: string,
): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) {
    // Set TTL only on first increment (avoids resetting window on each call)
    await redis.expire(key, RATE_LIMIT_LOGIN_TTL)
  }
  return count
}

export async function isRateLimited(
  redis: Redis,
  key: string,
): Promise<boolean> {
  const raw = await redis.get(key)
  if (!raw) return false
  return parseInt(raw, 10) >= RATE_LIMIT_MAX_ATTEMPTS
}

export async function clearRateLimit(redis: Redis, key: string): Promise<void> {
  await redis.del(key)
}
