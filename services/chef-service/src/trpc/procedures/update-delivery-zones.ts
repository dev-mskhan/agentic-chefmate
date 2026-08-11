import { z } from 'zod'
import { NotFoundError, ValidationError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'

const deliveryZoneInput = z.object({
  name:           z.string().max(60),
  postalCodes:    z.array(z.string()).min(1),
  radiusKm:       z.number().min(1).max(200).optional(),
  deliveryFee:    z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  isActive:       z.boolean().optional().default(true),
})

export const updateDeliveryZonesProcedure = protectedProcedure
  .input(z.object({
    deliveryZones: z.array(deliveryZoneInput).max(10),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') throw new ForbiddenError('Chef profile not found')
    const chefId = chef!._id.toString()

    // Validate unique zone names
    const names = input.deliveryZones.map((z) => z.name)
    if (new Set(names).size !== names.length) {
      throw new ValidationError('Delivery zone names must be unique')
    }

    const schedule = await ChefSchedule.findOne({ chefId })
    if (!schedule) throw new NotFoundError('No schedule found')

    const updated = await ChefSchedule.findOneAndUpdate(
      { chefId },
      { $set: { deliveryZones: input.deliveryZones } },
      { new: true, runValidators: true },
    )

    return updated
  })
