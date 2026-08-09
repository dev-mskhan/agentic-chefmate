import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { publishAuthEvent } from '../../services/event.service'
import { createPasswordResetToken } from '../../services/redis-session.service'

const forgotPasswordInput = z.object({
  email: z.string().email(),
})

export const forgotPasswordProcedure = publicProcedure
  .input(forgotPasswordInput)
  .mutation(async ({ input, ctx }) => {
    const { redis, config } = ctx

    const user = await User.findOne({ email: input.email.toLowerCase() })

    // Always return success to prevent user enumeration
    if (!user) {
      return { success: true }
    }

    // Store reset token in Redis: auth:password-reset:{sha256(rawToken)} → userId  (TTL 10 min)
    const rawToken = await createPasswordResetToken(redis, user._id.toString())
    const resetUrl = `${config.APP_URL}/reset-password?token=${rawToken}`

    // Publish event — notification-service picks this up and emails the reset link
    await publishAuthEvent({
      type: 'user.password_reset_requested',
      userId: user._id.toString(),
      email: user.email,
      resetUrl,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return { success: true }
  })
