import { chefProcedure } from '../trpc'
import { createConnectAccount } from '../../services/connect.service'

export const createConnectAccountProcedure = chefProcedure.mutation(async ({ ctx }) => {
  const account = await createConnectAccount(ctx.principal.userId)
  return { stripeAccountId: account.stripeAccountId, status: account.status }
})
