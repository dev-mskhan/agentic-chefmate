import { z } from 'zod'
import { NotFoundError, ValidationError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const addOneOffDateProcedure = protectedProcedure
  .input(z.object({
    date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    windows: z.array(z.object({
      openTime:  z.string().regex(TIME_REGEX, 'openTime must be HH:MM'),
      closeTime: z.string().regex(TIME_REGEX, 'closeTime must be HH:MM'),
    })).optional().default([]),
    note: z.string().max(100).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') throw new ForbiddenError('Chef profile not found')
    const chefId = chef!._id.toString()

    // Date must not be in the past
    const today = new Date().toISOString().slice(0, 10)
    if (input.date < today) throw new ValidationError('One-off date cannot be in the past')

    // Validate window order
    for (const w of input.windows) {
      if (w.openTime >= w.closeTime) {
        throw new ValidationError(`openTime ${w.openTime} must be before closeTime ${w.closeTime}`)
      }
    }

    const schedule = await ChefSchedule.findOne({ chefId })
    if (!schedule) throw new NotFoundError('No schedule found — create one first via upsertChefSchedule')

    if (schedule.oneOffDates.some((o) => o.date === input.date)) {
      throw new ValidationError(`One-off date ${input.date} already exists`)
    }
    if (schedule.oneOffDates.length >= 30) {
      throw new ValidationError('Maximum of 30 one-off dates reached')
    }

    await ChefSchedule.updateOne(
      { chefId },
      { $push: { oneOffDates: { date: input.date, windows: input.windows, note: input.note } } },
    )

    return { chefId, date: input.date }
  })
