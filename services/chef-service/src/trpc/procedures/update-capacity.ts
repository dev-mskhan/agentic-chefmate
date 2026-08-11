import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

export const updateCapacityProcedure = protectedProcedure
  .input(z.object({
    maxOrdersPerDay: z.number().int().min(1).max(50).optional(),
    prepTimeMinutes: z.number().int().min(15).max(1440).optional(),
    leadTimeHours:   z.number().int().min(1).max(168).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') throw new ForbiddenError('Chef profile not found')
    const chefId = chef!._id.toString()

    const schedule = await ChefSchedule.findOne({ chefId })
    if (!schedule) throw new NotFoundError('No schedule found')

    const setFields: Record<string, number> = {}
    if (input.maxOrdersPerDay !== undefined) setFields['capacity.maxOrdersPerDay'] = input.maxOrdersPerDay
    if (input.prepTimeMinutes !== undefined) setFields['capacity.prepTimeMinutes'] = input.prepTimeMinutes
    if (input.leadTimeHours   !== undefined) setFields['capacity.leadTimeHours']   = input.leadTimeHours

    const updated = await ChefSchedule.findOneAndUpdate(
      { chefId },
      { $set: setFields },
      { new: true },
    )

    await publishChefEvent({
      type:      'chef.availability.updated',
      chefId,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return updated
  })
