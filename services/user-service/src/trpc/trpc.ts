import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import { UnauthorizedError, ApiError } from '@chefmate/errors'
import type { UserContext } from './context'
import type { Principal } from '@chefmate/auth-clients'

const isDev = process.env['NODE_ENV'] !== 'production'

/**
 * Unwrap a thrown value to find an underlying ApiError.
 * tRPC wraps thrown errors in TRPCError, reachable via error.cause;
 * procedures themselves throw ApiError subclasses directly or via
 * TRPCError({ cause }) in the protectedProcedure middleware.
 */
function findApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err
  if (err && typeof err === 'object' && 'cause' in err) {
    const cause = (err as { cause: unknown }).cause
    if (cause instanceof ApiError) return cause
  }
  return null
}

const t = initTRPC.context<UserContext>().create({
  errorFormatter({ shape, error }) {
    const isZodError = error.cause instanceof ZodError
    const apiError = findApiError(error)

    const errors = isZodError
      ? (error.cause as ZodError).issues.map((i) => ({
          path:    i.path.join('.') || 'root',
          message: i.message,
        }))
      : undefined

    // Map domain errors (NotFoundError, ConflictError, RateLimitError, …)
    // to their intended HTTP status. Without this tRPC reports every thrown
    // ApiError as INTERNAL_SERVER_ERROR (500), losing the 404/409/429
    // semantics that callers and tests rely on.
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

export const router         = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure: rejects requests without a valid principal.
 * After this middleware, ctx.principal is guaranteed non-null.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing identity headers',
      cause: new UnauthorizedError('Missing identity headers'),
    })
  }
  return next({
    ctx: {
      ...ctx,
      principal: ctx.principal as Principal,
    },
  })
})
