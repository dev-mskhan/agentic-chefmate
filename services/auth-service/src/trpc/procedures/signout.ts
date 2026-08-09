import { protectedProcedure } from '../trpc'
import { RefreshToken } from '../../models/refresh-token.model'
import { blacklistToken, hashToken, removeSession } from '../../services/token.service'
import { clearAuthCookies, getAccessToken, getRefreshToken } from '../../services/session.service'
import { publishAuthEvent } from '../../services/event.service'

export const signoutProcedure = protectedProcedure.mutation(async ({ ctx }) => {
  const { req, res, redis } = ctx
  let userId: string | undefined
  let sessionId: string | undefined

  // ── Blacklist the current access token ────────────────────────────────
  const accessToken = getAccessToken(req)
  if (accessToken) {
    try {
      const parts = accessToken.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString())
        userId = payload.sub as string
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

  // ── Revoke refresh token + remove Redis session ───────────────────────
  const rawRefreshToken = getRefreshToken(req)
  if (rawRefreshToken) {
    const tokenDoc = await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(rawRefreshToken) },
      { revokedAt: new Date() },
      { new: false }, // return the original doc to grab sessionId
    )
    if (tokenDoc) {
      sessionId = tokenDoc.get('sessionId') as string | undefined
      if (!userId) {
        userId = tokenDoc.userId.toString()
      }
    }
  }

  // Remove Redis session entry
  if (sessionId) {
    await removeSession(redis, sessionId)
  }

  clearAuthCookies(res)

  if (userId) {
    await publishAuthEvent({
      type: 'user.logged_out',
      userId,
      sessionId,
      createdAt: new Date().toISOString(),
      version: '1',
    })
  }

  return { success: true }
})
