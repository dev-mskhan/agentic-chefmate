import { router } from './trpc'
import { createConnectAccountProcedure }    from './procedures/create-connect-account'
import { createOnboardingLinkProcedure }    from './procedures/create-onboarding-link'
import { getConnectAccountStatusProcedure } from './procedures/get-connect-account-status'
import { getBalanceProcedure }              from './procedures/get-balance'
import { getEarningsProcedure }             from './procedures/get-earnings'
import { getPayoutsProcedure }              from './procedures/get-payouts'
import { requestPayoutProcedure }           from './procedures/request-payout'
import { adminGetChefBalanceProcedure }     from './procedures/admin-get-chef-balance'
import { adminListPayoutsProcedure }        from './procedures/admin-list-payouts'

export const appRouter = router({
  // Chef procedures
  createConnectAccount:    createConnectAccountProcedure,
  createOnboardingLink:    createOnboardingLinkProcedure,
  getConnectAccountStatus: getConnectAccountStatusProcedure,
  getBalance:              getBalanceProcedure,
  getEarnings:             getEarningsProcedure,
  getPayouts:              getPayoutsProcedure,
  requestPayout:           requestPayoutProcedure,
  // Admin procedures
  adminGetChefBalance:     adminGetChefBalanceProcedure,
  adminListPayouts:        adminListPayoutsProcedure,
})

export type AppRouter = typeof appRouter
