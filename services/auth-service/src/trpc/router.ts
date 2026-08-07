import { router } from './trpc'
import { signupProcedure } from './procedures/signup'
import { signinProcedure } from './procedures/signin'
import { signoutProcedure } from './procedures/signout'
import { refreshProcedure } from './procedures/refresh'
import { verifyEmailProcedure } from './procedures/verify-email'
import { changeRoleProcedure } from './procedures/change-role'

export { router, publicProcedure, protectedProcedure, protectedRefreshProcedure, internalProcedure } from './trpc'

export const appRouter = router({
  signup: signupProcedure,
  signin: signinProcedure,
  signout: signoutProcedure,
  refresh: refreshProcedure,
  verifyEmail: verifyEmailProcedure,
  changeRole: changeRoleProcedure,
})

export type AppRouter = typeof appRouter
