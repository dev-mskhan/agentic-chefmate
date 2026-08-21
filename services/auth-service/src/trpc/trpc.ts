import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import type { AuthContext } from './context'
import { ApiError, UnauthorizedError } from '@chefmate/errors'

const isDev = process.env['NODE_ENV'] !== 'production'

/**
 * Unwrap a thrown value to find an underlying ApiError.
 * tRPC wraps thrown errors in TRPCError, reachable via error.cause; the
 * procedures themselves throw ApiError subclasses directly.
 */
function findApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err
  if (err && typeof err === 'object' && 'cause' in err) {
    const cause = (err as { cause: unknown }).cause
    if (cause instanceof ApiError) return cause
  }
  return null
}

const t = initTRPC.context<AuthContext>().create({
  errorFormatter({ shape, error }) {
    const isZodError = error.cause instanceof ZodError
    const apiError = findApiError(error)

    const errors = isZodError
      ? (error.cause as ZodError).issues.map((i) => ({
          path:    i.path.join('.') || 'root',
          message: i.message,
        }))
      : undefined

    // Map domain errors (ConflictError, UnauthorizedError, …) to their
    // intended HTTP status. Without this tRPC reports every thrown ApiError
    // as INTERNAL_SERVER_ERROR (500), losing the 409/401/404 semantics.
    const httpStatus = apiError
      ? apiError.statusCode
      : isZodError
        ? 400
        : shape.data.httpStatus

    return {
      ...shape,
      message: isZodError
        ? 'Validation failed'
        : apiError?.message ?? shape.message,
      data: {
        ...shape.data,
        httpStatus,
        stack:  isDev ? shape.data.stack : undefined,
        errors,
        ...(apiError?.data !== undefined ? { apiData: apiError.data } : {}),
      },
    }
  },
})

export const router                    = t.router
export const publicProcedure           = t.procedure
export const protectedProcedure        = t.procedure
export const protectedRefreshProcedure = t.procedure

/**
 * Internal procedure: only callable by other services using the shared
 * x-internal-secret header. This guards service-to-service endpoints
 * (e.g. changeRole) so external clients cannot invoke them directly.
 *
 * The gateway strips x-internal-secret from proxied requests (proxy.ts),
 * so this header can only be set by a service making a direct HTTP call.
 */
export const internalProcedure = t.procedure.use(({ ctx, next }) => {
  const provided = ctx.req.headers['x-internal-secret']
  const expected = ctx.config.INTERNAL_SECRET
  if (!provided || provided !== expected) {
    throw new UnauthorizedError('Missing or invalid internal secret')
  }
  return next({ ctx })
})
