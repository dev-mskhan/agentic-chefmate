import type { FastifyInstance } from 'fastify'
import passport from 'passport'
import { getPublicKeyJwk } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { issueTokenPair, hashToken, storeSession } from '../../services/token.service'
import { RefreshToken } from '../../models/refresh-token.model'
import { publishAuthEvent } from '../../services/event.service'
import { config } from '../../config'
import type { UpsertGoogleUserResult } from '../../services/oauth.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('auth-routes')

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/auth/.well-known/jwks.json
  // Returns the RS256 public key in JWK format for gateway to cache
  fastify.get('/.well-known/jwks.json', async (_request, reply) => {
    const jwk = await getPublicKeyJwk(config.JWT_PUBLIC_KEY, config.JWT_KEY_ID!)
    return reply.send({ keys: [jwk] })
  })

  // Helper to run Express/Passport middleware in Fastify
  const runMiddleware = (req: any, reply: any, middleware: any) => {
    // Fastify parses query string into req.query, but Express/Passport expects req.raw.query
    req.raw.query = req.query
    return new Promise<void>((resolve, reject) => {
      middleware(req.raw, reply.raw, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  // GET /api/v1/auth/google — redirect to Google consent screen
  fastify.get('/google', async (request, reply) => {
    await runMiddleware(request, reply, passport.authenticate('google', { session: false }))
  })

  // GET /api/v1/auth/google/callback — Google OAuth callback
  fastify.get(
    '/google/callback',
    async (request, reply) => {
      try {
        await runMiddleware(request, reply, passport.authenticate('google', {
          session: false,
          failureRedirect: `${config.APP_URL}/auth/error`,
        }))
      } catch (err) {
        logger.error({ err }, 'Google OAuth authentication failed')
        return reply.redirect(`${config.APP_URL}/auth/error`)
      }

      // Passport writes strategy result to request.raw.user
      const result = (request.raw as any).user as UpsertGoogleUserResult | undefined

      if (!result || !result.user) {
        logger.error('Google OAuth callback completed without user payload')
        return reply.redirect(`${config.APP_URL}/auth/error`)
      }

      const { user, isNewUser } = result

      const { accessToken, refreshToken, refreshTokenFamily, sessionId } = await issueTokenPair(
        { userId: user._id.toString(), role: user.role, email: user.email },
        config.JWT_PRIVATE_KEY,
        config.JWT_KEY_ID!,
      )

      const refreshTokenHash = hashToken(refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await RefreshToken.create({
        userId: user._id,
        tokenHash: refreshTokenHash,
        family: refreshTokenFamily,
        expiresAt,
        sessionId,
      })

      // Store active session in Redis
      await storeSession((fastify as any).redis, sessionId, user._id.toString(), refreshTokenHash, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      })

      setAuthCookies(reply, accessToken, refreshToken)

      if (isNewUser) {
        await publishAuthEvent({
          type: 'user.registered',
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          provider: 'google',
          createdAt: new Date().toISOString(),
          version: '1',
        })
      } else {
        await publishAuthEvent({
          type: 'user.logged_in',
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          createdAt: new Date().toISOString(),
          version: '1',
        })
      }

      logger.info({ userId: user._id.toString(), isNewUser }, 'Google OAuth successful')
      return reply.redirect(`${config.APP_URL}/auth/success`)
    },
  )
}
