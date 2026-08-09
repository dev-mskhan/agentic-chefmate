import { protectedProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { getAccessToken } from '../../services/session.service'
import { verifyToken } from '../../services/token.service'
import { UnauthorizedError, NotFoundError } from '@chefmate/errors'

export const getMeProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { req, config } = ctx

  const accessToken = getAccessToken(req)
  if (!accessToken) {
    throw new UnauthorizedError('Not authenticated')
  }

  // Verify and decode the access token to extract the userId
  const payload = await verifyToken(accessToken, config.JWT_PUBLIC_KEY)

  const user = await User.findById(payload.sub).select(
    '_id email role emailVerified googleId createdAt updatedAt',
  )
  if (!user) {
    throw new NotFoundError('User not found')
  }

  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    hasGoogleAccount: Boolean(user.googleId),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
})
