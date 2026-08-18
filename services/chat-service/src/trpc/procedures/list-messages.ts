import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { ChatThread } from '../../models/thread.model'
import { Message } from '../../models/message.model'
import { isParticipant } from '../../services/thread.service'

export const listMessagesProcedure = protectedProcedure
  .input(z.object({
    threadId: z.string(),
    cursor:   z.string().datetime().optional(),
    limit:    z.number().int().positive().max(100).default(50),
  }))
  .query(async ({ input, ctx }) => {
    const thread = await ChatThread.findById(input.threadId)
    if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
    if (!isParticipant(thread, ctx.principal.userId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
    }

    const effectiveLimit = Math.min(input.limit, 100)
    const query: Record<string, unknown> = { threadId: input.threadId }
    if (input.cursor) {
      query['createdAt'] = { $gt: new Date(input.cursor) }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(effectiveLimit)
      .lean()

    const nextCursor = messages.length > 0
      ? messages[messages.length - 1]!.createdAt.toISOString()
      : undefined

    return { messages, nextCursor }
  })
