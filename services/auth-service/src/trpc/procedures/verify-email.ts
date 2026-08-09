import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { publishAuthEvent } from '../../services/event.service'
import { consumeEmailVerificationToken } from '../../services/redis-session.service'
import { NotFoundError, UnauthorizedError } from '@chefmate/errors'

const verifyEmailInput = z.object({
  token: z.string().min(1),
})

export const verifyEmailProcedure = publicProcedure
  .input(verifyEmailInput)
  .mutation(async ({ input, ctx }) => {
    const { redis } = ctx

    // Consume one-time token from Redis (auth:email-verification:{sha256(token)})
    const userId = await consumeEmailVerificationToken(redis, input.token)
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired verification token')
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { emailVerified: true },
      { new: true },
    )

    if (!user) {
      throw new NotFoundError('User not found')
    }

    await publishAuthEvent({
      type: 'user.email_verified',
      userId: user._id.toString(),
      email: user.email,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return { verified: true, email: user.email }
  })
