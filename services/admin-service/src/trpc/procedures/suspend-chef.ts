import { z } from 'zod'
import { TRPCError }        from '@trpc/server'
import { adminProcedure }   from '../trpc'
import { callChefService }  from '../../services/cross-service'
import { createAuditEntry } from '../../services/audit.service'

export const suspendChefProcedure = adminProcedure
  .input(z.object({ chefId: z.string().min(1), reason: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    try {
      await callChefService(
        'updateChefStatus',
        { chefId: input.chefId, verificationStatus: 'SUSPENDED' },
        ctx.config.INTERNAL_SECRET,
        ctx.config.CHEF_SERVICE_URL,
      )
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to suspend chef: ${(err as Error).message}` })
    }
    await createAuditEntry({ adminUserId: ctx.principal.userId, action: 'CHEF_SUSPENDED', targetType: 'chef', targetId: input.chefId, reason: input.reason })
    return { success: true }
  })
