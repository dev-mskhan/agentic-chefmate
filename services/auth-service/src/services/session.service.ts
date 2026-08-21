import type { FastifyReply, FastifyRequest } from 'fastify'

const ACCESS_COOKIE = '__Host-access'
const REFRESH_COOKIE = '__Host-refresh'
const ACCESS_MAX_AGE = 15 * 60 // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

/**
 * Refresh-token cookie path.
 *
 * Cookie paths are prefix-matched by the browser, so scoping the refresh
 * cookie to `/api/v1/auth` ensures it is sent on the refresh mutation
 * (`/api/v1/auth/trpc/refresh`) AND on signout (`/api/v1/auth/trpc/signout`)
 * so the refresh token can be revoked on logout — but it is never sent to
 * any other service. This is the standard pattern: access cookie on `/`,
 * refresh cookie on the auth prefix only.
 */
const REFRESH_COOKIE_PATH = '/api/v1/auth'

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production'
}

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
): void {
  const secure = isProduction()
  const cookieName = secure ? '__Host-access' : 'access'
  const refreshCookieName = secure ? '__Host-refresh' : 'refresh'

  reply.setCookie(cookieName, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
    signed: true,
  })

  reply.setCookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE,
    signed: true,
  })
}

export function clearAuthCookies(reply: FastifyReply): void {
  const secure = isProduction()
  const cookieName = secure ? '__Host-access' : 'access'
  const refreshCookieName = secure ? '__Host-refresh' : 'refresh'

  reply.clearCookie(cookieName, { path: '/' })
  reply.clearCookie(refreshCookieName, { path: REFRESH_COOKIE_PATH })
}

export function getAccessToken(request: FastifyRequest): string | undefined {
  const secure = isProduction()
  const cookieName = secure ? '__Host-access' : 'access'
  const raw = request.cookies[cookieName]
  if (!raw) return undefined
  const unsigned = request.unsignCookie(raw)
  return unsigned.valid ? unsigned.value ?? undefined : undefined
}

export function getRefreshToken(request: FastifyRequest): string | undefined {
  const secure = isProduction()
  const cookieName = secure ? '__Host-refresh' : 'refresh'
  const raw = request.cookies[cookieName]
  if (!raw) return undefined
  const unsigned = request.unsignCookie(raw)
  return unsigned.valid ? unsigned.value ?? undefined : undefined
}
