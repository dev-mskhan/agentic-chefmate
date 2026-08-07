import { z } from 'zod'
import { internalProcedure } from '../trpc'
import { User } from '../../models/user.model'
import { NotFoundError } from '@chefmate/errors'
import { publishAuthEvent } from '../../services/event.service'
import type { Role } from '../../models/user.model'

const changeRoleInput = z.object({
  userId: z.string().min(1),
  newRole: z.enum(['USER', 'CHEF', 'ADMIN']),
})

export const changeRoleProcedure = internalProcedure
  .input(changeRoleInput)
  .mutation(async ({ input }) => {
    const user = await User.findById(input.userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    const oldRole = user.role
    user.role = input.newRole as Role
    await user.save()

    await publishAuthEvent({
      type: 'user.role_changed',
      userId: user._id.toString(),
      oldRole,
      newRole: input.newRole,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return { userId: user._id.toString(), oldRole, newRole: input.newRole }
  })
