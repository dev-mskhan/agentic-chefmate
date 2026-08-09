import { SignJWT, importPKCS8, importSPKI, jwtVerify, exportJWK } from 'jose'
import crypto from 'crypto'
import type { Redis } from 'ioredis'
import { createSession, deleteSession, SESSION_TTL } from './redis-session.service'

export interface TokenPair {
  accessToken: string
  refreshToken: string // raw opaque token (hex string)
  refreshTokenFamily: string
  accessTokenJti: string
  /** Identifies the Redis session entry — auth:session:{sessionId} */
  sessionId: string
}

export interface AccessTokenPayload {
  sub: string
  role: string
  email: string
  jti: string
  iat: number
  exp: number
}

const ACCESS_TOKEN_TTL = 15 * 60  // 15 minutes in seconds
const REFRESH_TOKEN_TTL = SESSION_TTL // keep in sync with Redis TTL

export async function issueTokenPair(
  payload: { userId: string; role: string; email: string },
  privateKeyPem: string,
  keyId: string,
): Promise<TokenPair> {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  const jti = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const accessToken = await new SignJWT({
    sub: payload.userId,
    role: payload.role,
    email: payload.email,
    jti,
  })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL)
    .sign(privateKey)

  const refreshToken = crypto.randomBytes(64).toString('hex')
  const refreshTokenFamily = crypto.randomUUID()
  const sessionId = crypto.randomUUID()

  return { accessToken, refreshToken, refreshTokenFamily, accessTokenJti: jti, sessionId }
}

/**
 * Persist a Redis session for a newly issued token pair.
 * Call this immediately after issueTokenPair.
 */
export async function storeSession(
  redis: Redis,
  sessionId: string,
  userId: string,
  refreshTokenHash: string,
  meta: { ip?: string; userAgent?: string; device?: string },
): Promise<void> {
  await createSession(redis, sessionId, {
    userId,
    refreshTokenHash,
    ip: meta.ip,
    userAgent: meta.userAgent,
    device: meta.device,
    expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL,
  })
}

/**
 * Remove a Redis session when signing out or rotating tokens.
 */
export async function removeSession(redis: Redis, sessionId: string): Promise<void> {
  await deleteSession(redis, sessionId)
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function blacklistToken(
  redis: Redis,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(`auth:blacklist:${jti}`, '1', 'EX', ttlSeconds)
}

export async function isBlacklisted(redis: Redis, jti: string): Promise<boolean> {
  const val = await redis.get(`auth:blacklist:${jti}`)
  return val !== null
}

export async function getPublicKeyJwk(
  publicKeyPem: string,
  keyId: string,
): Promise<object> {
  const publicKey = await importSPKI(publicKeyPem, 'RS256')
  const jwk = await exportJWK(publicKey)
  return { ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }
}

export async function verifyToken(
  token: string,
  publicKeyPem: string,
): Promise<AccessTokenPayload> {
  const publicKey = await importSPKI(publicKeyPem, 'RS256')
  const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
  return payload as unknown as AccessTokenPayload
}
