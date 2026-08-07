import { z } from 'zod'
import * as argon2 from 'argon2'
import crypto from 'crypto'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { RefreshToken } from '../../models/refresh-token.model'
import { issueTokenPair, hashToken } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { publishAuthEvent } from '../../services/event.service'
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
    const { redis, config } = ctx

    // Check for existing user
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      throw new ConflictError('Email already registered')
    }

    // Hash password
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'USER',
      emailVerified: false,
    })

    // Issue token pair
    const { accessToken, refreshToken, refreshTokenFamily, accessTokenJti } =
      await issueTokenPair(
        { userId: user._id.toString(), role: user.role, email: user.email },
        config.JWT_PRIVATE_KEY,
        config.JWT_KEY_ID!,
      )

    // Store refresh token hash in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      family: refreshTokenFamily,
      expiresAt,
    })

    // Set signed cookies
    setAuthCookies(ctx.res, accessToken, refreshToken)

    // Publish event
    await publishAuthEvent({
      type: 'user.registered',
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      provider: 'local',
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }
  })
