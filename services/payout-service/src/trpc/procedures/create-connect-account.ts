import { chefProcedure } from '../trpc'
import { createConnectAccount } from '../../services/connect.service'
import { resolveChefId } from '../../services/chef-client.service'

export const createConnectAccountProcedure = chefProcedure.mutation(async ({ ctx }) => {
  const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
  const account = await createConnectAccount(chefId)
  return { stripeAccountId: account.stripeAccountId, status: account.status }
})
