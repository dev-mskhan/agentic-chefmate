import { chefProcedure } from '../trpc'
import { getAvailableBalance } from '../../services/balance.service'
import { resolveChefId } from '../../services/chef-client.service'

export const getBalanceProcedure = chefProcedure.query(async ({ ctx }) => {
  const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
  return getAvailableBalance(chefId)
})
