import { z } from 'zod'
import * as argon2 from 'argon2'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { publishAuthEvent } from '../../services/event.service'
import { consumePasswordResetToken } from '../../services/redis-session.service'
import { UnauthorizedError, NotFoundError } from '@chefmate/errors'

const resetPasswordInput = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const resetPasswordProcedure = publicProcedure
  .input(resetPasswordInput)
  .mutation(async ({ input, ctx }) => {
    const { redis } = ctx

    // Consume one-time token from Redis (auth:password-reset:{sha256(token)})
    const userId = await consumePasswordResetToken(redis, input.token)
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired password reset token')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id })
    user.passwordHash = passwordHash
    await user.save()

    await publishAuthEvent({
      type: 'user.password_changed',
      userId: user._id.toString(),
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return { success: true }
  })
