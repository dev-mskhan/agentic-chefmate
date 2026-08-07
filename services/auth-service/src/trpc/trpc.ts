import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import type { AuthContext } from './context'

const isDev = process.env['NODE_ENV'] !== 'production'

const t = initTRPC.context<AuthContext>().create({
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

export const router                    = t.router
export const publicProcedure           = t.procedure
export const protectedProcedure        = t.procedure
export const protectedRefreshProcedure = t.procedure
export const internalProcedure         = t.procedure
