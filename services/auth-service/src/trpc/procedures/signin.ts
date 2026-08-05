import { z } from 'zod'
import * as argon2 from 'argon2'
import { publicProcedure } from '../router'
import { User } from '../../models/user.model'
import { RefreshToken } from '../../models/refresh-token.model'
import { issueTokenPair, hashToken } from '../../services/token.service'
import { setAuthCookies } from '../../services/session.service'
import { UnauthorizedError } from '@chefmate/errors'

const signinInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const signinProcedure = publicProcedure
  .input(signinInput)
  .mutation(async ({ input, ctx }) => {
    const { email, password } = input
    const { config } = ctx

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const isValid = await argon2.verify(user.passwordHash, password)
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password')
    }

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

    setAuthCookies(ctx.res, accessToken, refreshToken)

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }
  })
