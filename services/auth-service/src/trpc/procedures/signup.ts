import { z } from 'zod'
import * as argon2 from 'argon2'
import { publicProcedure } from '../trpc'
import { User, IUser } from '../../models/user.model'
import { RefreshToken } from '../../models/refresh-token.model'
import { issueTokenPair, hashToken, storeSession } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { publishAuthEvent } from '../../services/event.service'
import { createEmailVerificationToken } from '../../services/redis-session.service'
import { ConflictError } from '@chefmate/errors'

const signupInput = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const signupProcedure = publicProcedure
  .input(signupInput)
  .mutation(async ({ input, ctx }) => {
    const { email, password } = input
    const { redis, config, req } = ctx
    const normalizedEmail = email.toLowerCase()

    let user = await User.findOne({ email: normalizedEmail })
    let isNewUser = false

    if (user) {
      if (user.passwordHash) {
        throw new ConflictError('Email already registered')
      }
      // User registered via Google previously — set password on existing account
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
      user.passwordHash = passwordHash
      await user.save()
    } else {
      isNewUser = true
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
      user = await User.create({
        email: normalizedEmail,
        passwordHash,
        role: 'USER',
        emailVerified: false,
      })
    }

    // Issue token pair
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
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    setAuthCookies(ctx.res, accessToken, refreshToken)

    if (isNewUser) {
      const rawVerifyToken = await createEmailVerificationToken(redis, user._id.toString())
      const verifyUrl = `${config.APP_URL}/verify-email?token=${rawVerifyToken}`

      await publishAuthEvent({
        type: 'user.registered',
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        provider: 'local',
        verifyUrl,
        createdAt: new Date().toISOString(),
        version: '1',
      })
    } else {
      await publishAuthEvent({
        type: 'user.logged_in',
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
        version: '1',
      })
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }
  })
