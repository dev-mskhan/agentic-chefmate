import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { ChatThread } from '../../models/thread.model'
import { isParticipant } from '../../services/thread.service'

export const getUnreadCountProcedure = protectedProcedure
  .input(z.object({ threadId: z.string() }))
  .query(async ({ input, ctx }) => {
    const thread = await ChatThread.findById(input.threadId)
    if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
    if (!isParticipant(thread, ctx.principal.userId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
    }

    const unreadCount = ctx.principal.role === 'USER'
      ? thread.customerUnreadCount
      : thread.chefUnreadCount

    return { unreadCount }
  })
