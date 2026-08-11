import { z } from 'zod'
import { NotFoundError, ValidationError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const addBlackoutDateProcedure = protectedProcedure
  .input(z.object({
    date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    reason: z.enum(['VACATION', 'HOLIDAY', 'FULLY_BOOKED', 'PERSONAL', 'OTHER']),
    note:   z.string().max(100).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') throw new ForbiddenError('Chef profile not found')
    const chefId = chef!._id.toString()

    let schedule = await ChefSchedule.findOne({ chefId })
    if (!schedule) throw new NotFoundError('No schedule found — create one first via upsertChefSchedule')

    // Reject duplicate date + reason
    const exists = schedule.blackoutDates.some(
      (b) => b.date === input.date && b.reason === input.reason,
    )
    if (exists) throw new ValidationError(`Blackout already exists for ${input.date} with reason ${input.reason}`)

    // Enforce max 100
    if (schedule.blackoutDates.length >= 100) {
      throw new ValidationError('Maximum of 100 blackout dates reached')
    }

    await ChefSchedule.updateOne(
      { chefId },
      { $push: { blackoutDates: { date: input.date, reason: input.reason, note: input.note } } },
    )

    return { chefId, date: input.date, reason: input.reason }
  })
