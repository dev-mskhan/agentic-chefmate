import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { publishAuthEvent } from '../../services/event.service'
import { createEmailVerificationToken } from '../../services/redis-session.service'

const resendVerificationInput = z.object({
  email: z.string().email(),
})

export const resendVerificationProcedure = publicProcedure
  .input(resendVerificationInput)
  .mutation(async ({ input, ctx }) => {
    const { redis, config } = ctx

    const user = await User.findOne({ email: input.email.toLowerCase() })

    // Always return success to prevent user enumeration
    if (!user || user.emailVerified) {
      return { success: true }
    }

    // Overwrite any existing verification token (new TTL = 20 min)
    const rawToken = await createEmailVerificationToken(redis, user._id.toString())
    const verifyUrl = `${config.APP_URL}/verify-email?token=${rawToken}`

    // Re-use the user.registered event shape — notification-service already handles it
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

    return { success: true }
  })
