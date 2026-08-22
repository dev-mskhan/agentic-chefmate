import { chefProcedure } from '../trpc'
import { getConnectAccountStatus } from '../../services/connect.service'
import { resolveChefId } from '../../services/chef-client.service'

export const getConnectAccountStatusProcedure = chefProcedure.query(async ({ ctx }) => {
  const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
  return getConnectAccountStatus(chefId)
})
