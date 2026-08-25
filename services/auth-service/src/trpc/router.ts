import { router } from './trpc'
import { signupProcedure } from './procedures/signup'
import { signinProcedure } from './procedures/signin'
import { signoutProcedure } from './procedures/signout'
import { refreshProcedure } from './procedures/refresh'
import { verifyEmailProcedure } from './procedures/verify-email'
import { changeRoleProcedure } from './procedures/change-role'
import { forgotPasswordProcedure } from './procedures/forgot-password'
import { resetPasswordProcedure } from './procedures/reset-password'
import { resendVerificationProcedure } from './procedures/resend-verification'
import { getMeProcedure } from './procedures/get-me'
import { getUserContactProcedure } from './procedures/get-user-contact'

export { router, publicProcedure, protectedProcedure, protectedRefreshProcedure, internalProcedure } from './trpc'

export const appRouter = router({
  signup: signupProcedure,
  signin: signinProcedure,
  signout: signoutProcedure,
  refresh: refreshProcedure,
  verifyEmail: verifyEmailProcedure,
  changeRole: changeRoleProcedure,
  forgotPassword: forgotPasswordProcedure,
  resetPassword: resetPasswordProcedure,
  resendVerification: resendVerificationProcedure,
  me: getMeProcedure,
  getUserContact: getUserContactProcedure,
})

export type AppRouter = typeof appRouter
