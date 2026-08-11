import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getChefScheduleProcedure = protectedProcedure
  .input(z.object({ chefId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { chefId } = input
    const { userId, role } = ctx.principal

    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(chefId).select('userId').lean()
      if (!chef || chef.userId !== userId) throw new ForbiddenError('Access denied')
    }

    const schedule = await ChefSchedule.findOne({ chefId }).lean()
    if (!schedule) throw new NotFoundError('No schedule found for this chef')

    return schedule
  })
