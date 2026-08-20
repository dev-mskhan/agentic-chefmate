import { z } from 'zod'
import { TRPCError }        from '@trpc/server'
import { adminProcedure }   from '../trpc'
import { AdminUser }        from '../../models/user.model'
import { createAuditEntry } from '../../services/audit.service'

export const suspendUserProcedure = adminProcedure
  .input(z.object({ userId: z.string().min(1), reason: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const result = await AdminUser.findByIdAndUpdate(
      input.userId,
      { $set: { isSuspended: true, suspendedAt: new Date() } },
      { new: true },
    )
    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    await createAuditEntry({ adminUserId: ctx.principal.userId, action: 'USER_SUSPENDED', targetType: 'user', targetId: input.userId, reason: input.reason })
    return { success: true }
  })
