import { z } from 'zod'
import * as argon2 from 'argon2'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { RefreshToken } from '../../models/refresh-token.model'
import { issueTokenPair, hashToken, storeSession } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { publishAuthEvent } from '../../services/event.service'
import {
  rateLimitIpKey,
  rateLimitUserKey,
  incrementRateLimit,
  isRateLimited,
  clearRateLimit,
} from '../../services/redis-session.service'
import { UnauthorizedError, RateLimitError } from '@chefmate/errors'

const signinInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const signinProcedure = publicProcedure
  .input(signinInput)
  .mutation(async ({ input, ctx }) => {
    const { email, password } = input
    const { redis, config, req } = ctx
    const ip = req.ip

    // ── IP-level rate limit check (before any DB hit) ─────────────────────
    const ipKey = rateLimitIpKey(ip)
    if (await isRateLimited(redis, ipKey)) {
      throw new RateLimitError('Too many login attempts — try again later')
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    // ── User-level rate limit (only once we know the userId) ──────────────
    if (user) {
      const userKey = rateLimitUserKey(user._id.toString())
      if (await isRateLimited(redis, userKey)) {
        throw new RateLimitError('Too many login attempts — try again later')
      }
    }

    if (!user || !user.passwordHash) {
      // Still count the failed attempt against the IP
      await incrementRateLimit(redis, ipKey)
      throw new UnauthorizedError('Invalid email or password')
    }

    const isValid = await argon2.verify(user.passwordHash, password)
    if (!isValid) {
      await incrementRateLimit(redis, ipKey)
      await incrementRateLimit(redis, rateLimitUserKey(user._id.toString()))
      throw new UnauthorizedError('Invalid email or password')
    }

    // ── Successful auth — clear rate limit counters ───────────────────────
    await clearRateLimit(redis, ipKey)
    await clearRateLimit(redis, rateLimitUserKey(user._id.toString()))

    const { accessToken, refreshToken, refreshTokenFamily, sessionId } =
      await issueTokenPair(
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

    await storeSession(redis, sessionId, user._id.toString(), refreshTokenHash, {
      ip,
      userAgent: req.headers['user-agent'],
    })

    setAuthCookies(ctx.res, accessToken, refreshToken)

    await publishAuthEvent({
      type: 'user.logged_in',
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ip,
      userAgent: req.headers['user-agent'],
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }
  })
