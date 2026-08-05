import type { FastifyInstance } from 'fastify'
import passport from 'passport'
import { getPublicKeyJwk } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { issueTokenPair, hashToken } from '../../services/token.service'
import { RefreshToken } from '../../models/refresh-token.model'
import { publishAuthEvent } from '../../services/event.service'
import { config } from '../../config'
import type { IUser } from '../../models/user.model'

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/auth/.well-known/jwks.json
  // Returns the RS256 public key in JWK format for gateway to cache
  fastify.get('/.well-known/jwks.json', async (_request, reply) => {
    const jwk = await getPublicKeyJwk(config.JWT_PUBLIC_KEY, config.JWT_KEY_ID)
    return reply.send({ keys: [jwk] })
  })

  // GET /api/v1/auth/google — redirect to Google consent screen
  fastify.get('/google', { preHandler: passport.authenticate('google', { session: false }) }, async () => {
    // Passport handles the redirect
  })

  // GET /api/v1/auth/google/callback — Google OAuth callback
  fastify.get(
    '/google/callback',
    {
      preHandler: passport.authenticate('google', {
        session: false,
        failureRedirect: `${config.APP_URL}/auth/error`,
      }),
    },
    async (request, reply) => {
      const user = (request as any).user as IUser

      const { accessToken, refreshToken, refreshTokenFamily } = await issueTokenPair(
        { userId: user._id.toString(), role: user.role, email: user.email },
        config.JWT_PRIVATE_KEY,
        config.JWT_KEY_ID,
      )

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await RefreshToken.create({
        userId: user._id,
        tokenHash: hashToken(refreshToken),
        family: refreshTokenFamily,
        expiresAt,
      })

      setAuthCookies(reply, accessToken, refreshToken)

      await publishAuthEvent({
        type: 'user.registered',
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        provider: 'google',
        createdAt: new Date().toISOString(),
        version: '1',
      })

      return reply.redirect(`${config.APP_URL}/auth/success`)
    },
  )
}
