import type { FastifyReply, FastifyRequest } from 'fastify'

const ACCESS_COOKIE = '__Host-access'
const REFRESH_COOKIE = '__Host-refresh'
const ACCESS_MAX_AGE = 15 * 60 // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

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
    path: '/api/v1/auth/refresh',
    maxAge: REFRESH_MAX_AGE,
    signed: true,
  })
}

export function clearAuthCookies(reply: FastifyReply): void {
  const secure = isProduction()
  const cookieName = secure ? '__Host-access' : 'access'
  const refreshCookieName = secure ? '__Host-refresh' : 'refresh'

  reply.clearCookie(cookieName, { path: '/' })
  reply.clearCookie(refreshCookieName, { path: '/api/v1/auth/refresh' })
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
