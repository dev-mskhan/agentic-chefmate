import { z } from 'zod'
import { publicProcedure } from '../router'
import { User } from '../../models/user.model'
import { NotFoundError, UnauthorizedError } from '@chefmate/errors'

const verifyEmailInput = z.object({
  token: z.string().min(1),
})

export const verifyEmailProcedure = publicProcedure
  .input(verifyEmailInput)
  .mutation(async ({ input, ctx }) => {
    const { redis } = ctx
    const redisKey = `auth:email_verify:${input.token}`

    const userId = await redis.get(redisKey)
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

    // Consume the token (one-time use)
    await redis.del(redisKey)

    return { verified: true, email: user.email }
  })
