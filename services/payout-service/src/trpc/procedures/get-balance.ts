import { chefProcedure } from '../trpc'
import { getAvailableBalance } from '../../services/balance.service'

export const getBalanceProcedure = chefProcedure.query(async ({ ctx }) => {
  return getAvailableBalance(ctx.principal.userId)
})
