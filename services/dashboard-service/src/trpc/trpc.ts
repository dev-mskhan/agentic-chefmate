import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import { UnauthorizedError, ForbiddenError } from '@chefmate/errors'
import type { DashboardContext } from './context'
import type { Principal } from '@chefmate/auth-clients'

const isDev = process.env['NODE_ENV'] !== 'production'

const t = initTRPC.context<DashboardContext>().create({
  errorFormatter({ shape, error }) {
    const isZodError = error.cause instanceof ZodError
    const errors = isZodError
      ? (error.cause as ZodError).issues.map((i) => ({ path: i.path.join('.') || 'root', message: i.message }))
      : undefined
    return {
      ...shape,
      message: isZodError ? 'Validation failed' : shape.message,
      data: { ...shape.data, stack: isDev ? shape.data.stack : undefined, errors },
    }
  },
})

export const router          = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing identity headers',
      cause: new UnauthorizedError('Missing identity headers'),
    })
  }
  return next({ ctx: { ...ctx, principal: ctx.principal as Principal } })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin role required',
      cause: new ForbiddenError('Admin role required'),
    })
  }
  return next({ ctx })
})

export const chefProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'CHEF') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Chef role required',
      cause: new ForbiddenError('Chef role required'),
    })
  }
  return next({ ctx })
})
