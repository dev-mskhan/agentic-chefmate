import { z } from 'zod'
import { ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const removeOneOffDateProcedure = protectedProcedure
  .input(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') throw new ForbiddenError('Chef profile not found')
    const chefId = chef!._id.toString()

    await ChefSchedule.updateOne(
      { chefId },
      { $pull: { oneOffDates: { date: input.date } } },
    )

    return { chefId, date: input.date, removed: true }
  })
