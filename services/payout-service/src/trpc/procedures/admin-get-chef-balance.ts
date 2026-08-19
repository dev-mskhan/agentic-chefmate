import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { getAvailableBalance } from '../../services/balance.service'

export const adminGetChefBalanceProcedure = adminProcedure
  .input(z.object({ chefId: z.string().min(1) }))
  .query(async ({ input }) => getAvailableBalance(input.chefId))
