import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import { UnauthorizedError } from '@chefmate/errors'
import type { UserContext } from './context'
import type { Principal } from '@chefmate/auth-clients'

const isDev = process.env['NODE_ENV'] !== 'production'

const t = initTRPC.context<UserContext>().create({
  errorFormatter({ shape, error }) {
    const isZodError = error.cause instanceof ZodError
    const errors = isZodError
      ? (error.cause as ZodError).issues.map((i) => ({
          path:    i.path.join('.') || 'root',
          message: i.message,
        }))
      : undefined

    return {
      ...shape,
      message: isZodError ? 'Validation failed' : shape.message,
      data: {
        ...shape.data,
        stack:  isDev ? shape.data.stack : undefined,
        errors,
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
