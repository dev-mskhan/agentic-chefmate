import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import { UnauthorizedError, ForbiddenError, ApiError } from '@chefmate/errors'
import type { ChefContext } from './context'
import type { Principal } from '@chefmate/auth-clients'

const isDev = process.env['NODE_ENV'] !== 'production'

/**
 * Unwrap a thrown value to find an underlying ApiError.
 * tRPC wraps thrown errors in TRPCError, reachable via error.cause.
 */
function findApiError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err
  if (err && typeof err === 'object' && 'cause' in err) {
    const cause = (err as { cause: unknown }).cause
    if (cause instanceof ApiError) return cause
  }
  return null
}

const t = initTRPC.context<ChefContext>().create({
  errorFormatter({ shape, error }) {
    const isZodError = error.cause instanceof ZodError
    const apiError = findApiError(error)

    const errors = isZodError
      ? (error.cause as ZodError).issues.map((i) => ({
          path:    i.path.join('.') || 'root',
          message: i.message,
        }))
      : undefined

    // Map domain errors to their intended HTTP status.
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
      },
    }
  },
})

export const router          = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure: rejects requests without a valid principal.
 * After this middleware, ctx.principal is guaranteed non-null.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) {
    throw new UnauthorizedError('Missing identity headers')
  }
  return next({
    ctx: {
      ...ctx,
      principal: ctx.principal as Principal,
    },
  })
})

/**
 * Chef procedure: requires role === 'CHEF'.
 */
export const chefProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'CHEF') {
    throw new ForbiddenError('Chef role required')
  }
  return next({ ctx })
})

/**
 * Admin procedure: requires role === 'ADMIN'.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'ADMIN') {
    throw new ForbiddenError('Admin role required')
  }
  return next({ ctx })
})
