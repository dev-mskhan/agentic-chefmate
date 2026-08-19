import { chefProcedure } from '../trpc'
import { getConnectAccountStatus } from '../../services/connect.service'

export const getConnectAccountStatusProcedure = chefProcedure.query(async ({ ctx }) => {
  return getConnectAccountStatus(ctx.principal.userId)
})
