import { z } from 'zod'
import { internalProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { NotFoundError } from '@chefmate/errors'

export const getUserContactProcedure = internalProcedure
  .input(z.object({ userId: z.string().min(1) }))
  .query(async ({ input }) => {
    const user = await User.findById(input.userId).select('_id email')
    if (!user) throw new NotFoundError('User not found')
    return { userId: user._id.toString(), email: user.email }
  })
