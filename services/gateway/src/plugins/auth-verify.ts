import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { importSPKI } from 'jose'
import { verifyAccessToken } from '@chefmate/auth-clients'
import { UnauthorizedError, ForbiddenError, toHttpResponse } from '@chefmate/errors'
import { config } from '../config'
import type { Role } from '@chefmate/auth-clients'

const BLACKLIST_PREFIX = 'auth:blacklist:'
const JWKS_CACHE_KEY = 'gateway:jwks:public_key'

// Cache the imported key in memory (rotated when Redis TTL expires)
let cachedPublicKey: Awaited<ReturnType<typeof importSPKI>> | null = null

async function getPublicKey(fastify: FastifyInstance) {
  if (cachedPublicKey) return cachedPublicKey

  // Try Redis cache
  const cached = await (fastify as any).redis.get(JWKS_CACHE_KEY)
  if (cached) {
    cachedPublicKey = await importSPKI(cached, 'RS256')
    return cachedPublicKey
  }

  // Fetch from auth-service JWKS endpoint
  const url = `${config.AUTH_SERVICE_URL}/api/v1/auth/.well-known/jwks.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`)

  const { keys } = (await res.json()) as { keys: Array<{ n: string; e: string; kty: string }> }
  const key = keys[0]
  if (!key) throw new Error('No keys in JWKS response')

  // Convert JWK to PEM via jose
  const { importJWK } = await import('jose')
  const publicKey = await importJWK(key, 'RS256')

  // Cache in Redis
  const { exportSPKI } = await import('jose')
  const pem = await exportSPKI(publicKey as Parameters<typeof exportSPKI>[0])
  await (fastify as any).redis.set(JWKS_CACHE_KEY, pem, 'EX', config.JWKS_CACHE_TTL_SECONDS)

  cachedPublicKey = publicKey as Awaited<ReturnType<typeof importSPKI>>
  return cachedPublicKey
}

export function createAuthVerifyHook(allowedRoles?: Role[]) {
  return async function authVerifyHook(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const cookieName = process.env['NODE_ENV'] === 'production' ? '__Host-access' : 'access'
    const rawCookie = request.cookies[cookieName]

    if (!rawCookie) {
      return reply.code(401).send(toHttpResponse(new UnauthorizedError('No access token')))
    }

    const unsigned = request.unsignCookie(rawCookie)
    if (!unsigned.valid || !unsigned.value) {
      return reply.code(401).send(toHttpResponse(new UnauthorizedError('Invalid cookie signature')))
    }

    const token = unsigned.value

    try {
      const publicKey = await getPublicKey(request.server)
      const payload = await verifyAccessToken(token, publicKey)

      // Check Redis blacklist (catches signed-out tokens)
      const blacklisted = await (request.server as any).redis.get(
        `${BLACKLIST_PREFIX}${payload.jti}`,
      )
      if (blacklisted) {
        return reply.code(401).send(toHttpResponse(new UnauthorizedError('Token has been revoked')))
      }

      // Check role if required
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(payload.role as Role)) {
          return reply.code(403).send(toHttpResponse(new ForbiddenError()))
        }
      }

      // Attach principal headers for downstream services
      request.headers['x-user-id'] = payload.sub
      request.headers['x-user-role'] = payload.role
      request.headers['x-user-email'] = payload.email
    } catch (err) {
      request.log.error({ err }, 'auth-verify: token verification failed')
      return reply.code(401).send(toHttpResponse(new UnauthorizedError('Invalid or expired token')))
    }
  }
}

export default fp(async function authVerifyPlugin(fastify: FastifyInstance) {
  // Warm up public key cache at boot
  try {
    await getPublicKey(fastify)
    fastify.log.info('JWKS public key cached')
  } catch (err) {
    fastify.log.warn({ err }, 'Could not pre-fetch JWKS — will retry on first request')
  }
})
