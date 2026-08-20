import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { AdminUser }      from '../../models/user.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listUsersProcedure = adminProcedure
  .input(CursorInputSchema.extend({
    role:          z.enum(['USER', 'CHEF', 'ADMIN']).optional(),
    emailVerified: z.boolean().optional(),
    isSuspended:   z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    const filter: Record<string, unknown> = { ...buildCursorFilter(input.cursor) }
    if (input.role          !== undefined) filter['role']          = input.role
    if (input.emailVerified !== undefined) filter['emailVerified'] = input.emailVerified
    if (input.isSuspended   !== undefined) filter['isSuspended']   = input.isSuspended

    // Never return passwordHash
    const users = await AdminUser.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()
    return { users, nextCursor: resolveNextCursor(users as any[], input.limit) }
  })
