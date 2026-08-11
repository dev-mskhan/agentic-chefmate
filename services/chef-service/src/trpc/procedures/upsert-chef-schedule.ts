import { z } from 'zod'
import { ValidationError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefSchedule } from '../../models/chef-schedule.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const timeWindowInput = z.object({
  openTime:  z.string().regex(TIME_REGEX, 'openTime must be HH:MM'),
  closeTime: z.string().regex(TIME_REGEX, 'closeTime must be HH:MM'),
})

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

const recurringDayInput = z.object({
  dayOfWeek: z.enum(WEEK_DAYS),
  windows:   z.array(timeWindowInput).max(5).optional().default([]),
  isActive:  z.boolean().optional().default(true),
})

const oneOffDateInput = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  windows: z.array(timeWindowInput).optional().default([]),
  note:    z.string().max(100).optional(),
})

const blackoutDateInput = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.enum(['VACATION', 'HOLIDAY', 'FULLY_BOOKED', 'PERSONAL', 'OTHER']),
  note:   z.string().max(100).optional(),
})

const capacityInput = z.object({
  maxOrdersPerDay: z.number().int().min(1).max(50).optional(),
  prepTimeMinutes: z.number().int().min(15).max(1440).optional(),
  leadTimeHours:   z.number().int().min(1).max(168).optional(),
})

const deliveryZoneInput = z.object({
  name:           z.string().max(60),
  postalCodes:    z.array(z.string()).min(1),
  radiusKm:       z.number().min(1).max(200).optional(),
  deliveryFee:    z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  isActive:       z.boolean().optional().default(true),
})

const upsertScheduleInput = z.object({
  recurringDays: z.array(recurringDayInput).max(7).optional(),
  oneOffDates:   z.array(oneOffDateInput).max(30).optional(),
  blackoutDates: z.array(blackoutDateInput).max(100).optional(),
  capacity:      capacityInput.optional(),
  deliveryZones: z.array(deliveryZoneInput).max(10).optional(),
})

function validateWindowOrder(windows: Array<{ openTime: string; closeTime: string }>): void {
  for (const w of windows) {
    if (w.openTime >= w.closeTime) {
      throw new ValidationError(`openTime ${w.openTime} must be before closeTime ${w.closeTime}`)
    }
  }
}

export const upsertChefScheduleProcedure = protectedProcedure
  .input(upsertScheduleInput)
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    // Resolve owning chef — procedure operates on the caller's chef profile
    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef && role !== 'ADMIN') {
      throw new ForbiddenError('Chef profile not found')
    }
    const chefId = chef!._id.toString()

    // Validate duplicate recurring days
    if (input.recurringDays) {
      const days = input.recurringDays.map((d) => d.dayOfWeek)
      if (new Set(days).size !== days.length) {
        throw new ValidationError('Duplicate dayOfWeek in recurringDays')
      }
      for (const day of input.recurringDays) {
        validateWindowOrder(day.windows ?? [])
      }
    }

    // Validate duplicate one-off dates
    if (input.oneOffDates) {
      const dates = input.oneOffDates.map((d) => d.date)
      if (new Set(dates).size !== dates.length) {
        throw new ValidationError('Duplicate dates in oneOffDates')
      }
      for (const d of input.oneOffDates) {
        validateWindowOrder(d.windows ?? [])
      }
    }

    // Build partial $set — only fields present in input are updated
    const setPayload: Record<string, unknown> = {}
    if (input.recurringDays !== undefined) setPayload['recurringDays'] = input.recurringDays
    if (input.oneOffDates   !== undefined) setPayload['oneOffDates']   = input.oneOffDates
    if (input.blackoutDates !== undefined) setPayload['blackoutDates'] = input.blackoutDates
    if (input.deliveryZones !== undefined) setPayload['deliveryZones'] = input.deliveryZones
    if (input.capacity) {
      if (input.capacity.maxOrdersPerDay !== undefined)
        setPayload['capacity.maxOrdersPerDay'] = input.capacity.maxOrdersPerDay
      if (input.capacity.prepTimeMinutes !== undefined)
        setPayload['capacity.prepTimeMinutes'] = input.capacity.prepTimeMinutes
      if (input.capacity.leadTimeHours !== undefined)
        setPayload['capacity.leadTimeHours'] = input.capacity.leadTimeHours
    }

    const updated = await ChefSchedule.findOneAndUpdate(
      { chefId },
      { $set: setPayload },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )

    await publishChefEvent({
      type:      'chef.availability.updated',
      chefId,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return updated
  })
