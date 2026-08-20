import { z } from 'zod'
import { TRPCError }        from '@trpc/server'
import { adminProcedure }   from '../trpc'
import { callChefService }  from '../../services/cross-service'
import { createAuditEntry } from '../../services/audit.service'

export const restoreChefProcedure = adminProcedure
  .input(z.object({ chefId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    try {
      await callChefService(
        'updateChefStatus',
        { chefId: input.chefId, verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
        ctx.config.INTERNAL_SECRET!,
        ctx.config.CHEF_SERVICE_URL!,
      )
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to restore chef: ${(err as Error).message}` })
    }
    await createAuditEntry({ adminUserId: ctx.principal.userId, action: 'CHEF_RESTORED', targetType: 'chef', targetId: input.chefId })
    return { success: true }
  })
