import { SignJWT, importPKCS8, importSPKI, jwtVerify, exportJWK } from 'jose'
import crypto from 'crypto'
import type { Redis } from 'ioredis'

export interface TokenPair {
  accessToken: string
  refreshToken: string // raw opaque token (hex string)
  refreshTokenFamily: string
  accessTokenJti: string
}

export interface AccessTokenPayload {
  sub: string
  role: string
  email: string
  jti: string
  iat: number
  exp: number
}

const ACCESS_TOKEN_TTL = 15 * 60 // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

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

  return { accessToken, refreshToken, refreshTokenFamily, accessTokenJti: jti }
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
