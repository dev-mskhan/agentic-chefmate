import { z } from 'zod'
import { TRPCError }          from '@trpc/server'
import { adminProcedure }     from '../trpc'
import { callReviewService }  from '../../services/cross-service'
import { createAuditEntry }   from '../../services/audit.service'

export const adminModerateReviewProcedure = adminProcedure
  .input(z.object({
    reviewId: z.string().min(1),
    status:   z.enum(['PUBLISHED', 'HIDDEN', 'REJECTED']),
    reason:   z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      await callReviewService(
        'moderateReview',
        { reviewId: input.reviewId, status: input.status },
        ctx.config.INTERNAL_SECRET,
        ctx.config.REVIEW_SERVICE_URL,
      )
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to moderate review: ${(err as Error).message}` })
    }
    await createAuditEntry({
      adminUserId: ctx.principal.userId,
      action:      'REVIEW_MODERATED',
      targetType:  'review',
      targetId:    input.reviewId,
      reason:      input.reason,
      metadata:    { newStatus: input.status },
    })
    return { success: true }
  })
