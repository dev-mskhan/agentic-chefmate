import { z } from 'zod'
import { protectedProcedure } from '../router'
import { RefreshToken } from '../../models/refresh-token.model'
import { blacklistToken, hashToken } from '../../services/token.service'
import { clearAuthCookies, getAccessToken, getRefreshToken } from '../../services/session.service'

export const signoutProcedure = protectedProcedure.mutation(async ({ ctx }) => {
  const { req, res, redis } = ctx

  // Blacklist the current access token
  const accessToken = getAccessToken(req)
  if (accessToken) {
    try {
      // Decode without verifying to get jti and exp (we already verified in middleware)
      const parts = accessToken.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString())
        const now = Math.floor(Date.now() / 1000)
        const remaining = (payload.exp as number) - now
        if (remaining > 0) {
          await blacklistToken(redis, payload.jti as string, remaining)
        }
      }
    } catch {
      // Non-critical — proceed with signout
    }
  }

  // Revoke refresh token
  const refreshToken = getRefreshToken(req)
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(refreshToken) },
      { revokedAt: new Date() },
    )
  }

  clearAuthCookies(res)
  return { success: true }
})
