import { initTRPC, TRPCError } from '@trpc/server'
import { AuthContext } from './context'
import { signupProcedure } from './procedures/signup'
import { signinProcedure } from './procedures/signin'
import { signoutProcedure } from './procedures/signout'
import { refreshProcedure } from './procedures/refresh'
import { verifyEmailProcedure } from './procedures/verify-email'
import { changeRoleProcedure } from './procedures/change-role'

const t = initTRPC.context<AuthContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure
export const protectedRefreshProcedure = t.procedure
export const internalProcedure = t.procedure

export const appRouter = router({
  signup: signupProcedure,
  signin: signinProcedure,
  signout: signoutProcedure,
  refresh: refreshProcedure,
  verifyEmail: verifyEmailProcedure,
  changeRole: changeRoleProcedure,
})

export type AppRouter = typeof appRouter
