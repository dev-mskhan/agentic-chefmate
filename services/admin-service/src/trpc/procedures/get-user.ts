import { z } from 'zod'
import { TRPCError }        from '@trpc/server'
import { adminProcedure }   from '../trpc'
import { AdminUser }        from '../../models/user.model'
import { AdminUserProfile } from '../../models/user-profile.model'

export const getUserProcedure = adminProcedure
  .input(z.object({ userId: z.string().min(1) }))
  .query(async ({ input }) => {
    const [user, profile] = await Promise.all([
      AdminUser.findById(input.userId).select('-passwordHash').lean(),
      AdminUserProfile.findOne({ userId: input.userId }).lean(),
    ])
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    return { ...(user as any), profile: profile ?? null }
  })
