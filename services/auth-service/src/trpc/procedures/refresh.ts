import { protectedRefreshProcedure } from '../router'
import { RefreshToken } from '../../models/refresh-token.model'
import {
  issueTokenPair,
  hashToken,
  blacklistToken,
} from '../../services/token.service'
import { setAuthCookies, getRefreshToken } from '../../services/session.service'
import { User } from '../../models/user.model'
import { UnauthorizedError } from '@chefmate/errors'

export const refreshProcedure = protectedRefreshProcedure.mutation(async ({ ctx }) => {
  const { req, res, redis, config } = ctx

  const rawRefreshToken = getRefreshToken(req)
  if (!rawRefreshToken) {
    throw new UnauthorizedError('No refresh token provided')
  }

  const tokenHash = hashToken(rawRefreshToken)
  const storedToken = await RefreshToken.findOne({ tokenHash })

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token')
  }

  // Theft detection: if token is already revoked, revoke entire family
  if (storedToken.revokedAt) {
    await RefreshToken.updateMany(
      { family: storedToken.family },
      { revokedAt: new Date() },
    )
    throw new UnauthorizedError('Refresh token reuse detected — please sign in again')
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired')
  }

  const user = await User.findById(storedToken.userId)
  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  // Revoke old token
  storedToken.revokedAt = new Date()
  await storedToken.save()

  // Issue new pair
  const { accessToken, refreshToken, refreshTokenFamily } = await issueTokenPair(
    { userId: user._id.toString(), role: user.role, email: user.email },
    config.JWT_PRIVATE_KEY,
    config.JWT_KEY_ID,
  )

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family: storedToken.family, // same family — keeps rotation chain
    expiresAt,
  })

  setAuthCookies(res, accessToken, refreshToken)
  return { userId: user._id.toString(), role: user.role }
})
