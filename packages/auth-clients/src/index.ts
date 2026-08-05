import { jwtVerify } from 'jose'
import type { KeyLike } from 'jose'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError, ForbiddenError, toHttpResponse } from '@chefmate/errors'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'USER' | 'CHEF' | 'ADMIN'

export interface JwtPayload {
  sub: string    // MongoDB ObjectId string (userId)
  role: Role
  email: string
  jti: string    // JWT ID for blacklisting
  iat: number
  exp: number
}

export interface Principal {
  userId: string
  role: Role
  email: string
}

// ─── verifyAccessToken ────────────────────────────────────────────────────────

/**
 * Verifies an RS256-signed JWT access token and returns the decoded payload.
 * Throws UnauthorizedError if the token is expired, has an invalid signature,
 * or fails verification for any other reason.
 */
export async function verifyAccessToken(
  token: string,
  publicKey: KeyLike | Uint8Array,
): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    })
    return payload as unknown as JwtPayload
  } catch (err) {
    throw new UnauthorizedError(
      err instanceof Error ? err.message : 'Token verification failed',
    )
  }
}

// ─── extractPrincipal ─────────────────────────────────────────────────────────

/**
 * Reads X-User-Id, X-User-Role, and X-User-Email from a headers map
 * (case-insensitive) and returns a Principal object.
 * Throws UnauthorizedError if any header is missing.
 */
export function extractPrincipal(
  headers: Record<string, string | string[] | undefined>,
): Principal {
  // Normalise keys to lower-case for case-insensitive lookup
  const normalised: Record<string, string | string[] | undefined> = {}
  for (const [key, value] of Object.entries(headers)) {
    normalised[key.toLowerCase()] = value
  }

  const rawUserId = normalised['x-user-id']
  const rawRole = normalised['x-user-role']
  const rawEmail = normalised['x-user-email']

  // Pick the first value when the header appears multiple times
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail

  if (!userId || !role || !email) {
    throw new UnauthorizedError('Missing principal headers')
  }

  return { userId, role: role as Role, email }
}

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Returns a Fastify preHandler hook that enforces role-based access control.
 * Reads the principal from request headers via extractPrincipal and checks
 * whether the principal's role is in the allowed roles list.
 * Sends a 403 response if the role is not permitted; calls done() otherwise.
 */
export function requireRole(...roles: Role[]) {
  return function (
    request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
  ): void {
    let principal: Principal

    try {
      principal = extractPrincipal(
        request.headers as Record<string, string | string[] | undefined>,
      )
    } catch {
      reply
        .code(401)
        .send(toHttpResponse(new UnauthorizedError('Missing principal headers')))
      return
    }

    if (!roles.includes(principal.role)) {
      reply.code(403).send(toHttpResponse(new ForbiddenError()))
      return
    }

    done()
  }
}
