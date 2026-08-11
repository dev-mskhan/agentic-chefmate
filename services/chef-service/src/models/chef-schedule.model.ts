import mongoose, { Schema, Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const BlackoutReasonValues = [
  'VACATION',
  'HOLIDAY',
  'FULLY_BOOKED',
  'PERSONAL',
  'OTHER',
] as const
export type BlackoutReason = typeof BlackoutReasonValues[number]

const WEEK_DAYS_SCHEDULE = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export type ScheduleWeekDay = typeof WEEK_DAYS_SCHEDULE[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ITimeWindow {
  openTime: string   // HH:MM 24h
  closeTime: string  // HH:MM 24h
}

export interface IRecurringDay {
  dayOfWeek: ScheduleWeekDay
  windows: ITimeWindow[]
  isActive: boolean
}

export interface IOneOffDate {
  date: string       // YYYY-MM-DD
  windows: ITimeWindow[]
  note?: string
}

export interface IBlackoutDate {
  date: string       // YYYY-MM-DD
  reason: BlackoutReason
  note?: string
}

export interface ICapacity {
  maxOrdersPerDay: number
  prepTimeMinutes: number
  leadTimeHours: number
}

export interface IDeliveryZone {
  name: string
  postalCodes: string[]
  radiusKm?: number
  deliveryFee?: number
  minOrderAmount?: number
  isActive: boolean
}

export interface IChefSchedule extends Document {
  chefId: string
  recurringDays: IRecurringDay[]
  oneOffDates: IOneOffDate[]
  blackoutDates: IBlackoutDate[]
  capacity: ICapacity
  deliveryZones: IDeliveryZone[]
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const TIME_WINDOW_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const timeWindowSchema = new Schema<ITimeWindow>(
  {
    openTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => TIME_WINDOW_REGEX.test(v),
        message: 'Invalid time format HH:MM',
      },
    },
    closeTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => TIME_WINDOW_REGEX.test(v),
        message: 'Invalid time format HH:MM',
      },
    },
  },
  { _id: false },
)

const recurringDaySchema = new Schema<IRecurringDay>(
  {
    dayOfWeek: { type: String, enum: WEEK_DAYS_SCHEDULE, required: true },
    windows: {
      type: [timeWindowSchema],
      default: [],
      validate: [(v: ITimeWindow[]) => v.length <= 5, 'Max 5 time windows per day'],
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

const oneOffDateSchema = new Schema<IOneOffDate>(
  {
    date:    { type: String, required: true },
    windows: { type: [timeWindowSchema], default: [] },
    note:    { type: String, maxlength: 100 },
  },
  { _id: false },
)

const blackoutDateSchema = new Schema<IBlackoutDate>(
  {
    date:   { type: String, required: true },
    reason: { type: String, enum: BlackoutReasonValues, required: true },
    note:   { type: String, maxlength: 100 },
  },
  { _id: false },
)

const capacitySchema = new Schema<ICapacity>(
  {
    maxOrdersPerDay: { type: Number, required: true, min: 1,  max: 50,   default: 5  },
    prepTimeMinutes: { type: Number, required: true, min: 15, max: 1440, default: 60 },
    leadTimeHours:   { type: Number, required: true, min: 1,  max: 168,  default: 24 },
  },
  { _id: false },
)

const deliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    name:           { type: String, required: true, maxlength: 60 },
    postalCodes:    {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length >= 1, 'At least one postal code required'],
    },
    radiusKm:       { type: Number, min: 1, max: 200 },
    deliveryFee:    { type: Number, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    isActive:       { type: Boolean, default: true },
  },
  { _id: true },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const chefScheduleSchema = new Schema<IChefSchedule>(
  {
    chefId: { type: String, required: true, unique: true },
    recurringDays: {
      type: [recurringDaySchema],
      default: [],
      validate: [(v: IRecurringDay[]) => v.length <= 7, 'Max 7 recurring days'],
    },
    oneOffDates: {
      type: [oneOffDateSchema],
      default: [],
      validate: [(v: IOneOffDate[]) => v.length <= 30, 'Max 30 one-off dates'],
    },
    blackoutDates: {
      type: [blackoutDateSchema],
      default: [],
      validate: [(v: IBlackoutDate[]) => v.length <= 100, 'Max 100 blackout dates'],
    },
    capacity: {
      type: capacitySchema,
      default: () => ({ maxOrdersPerDay: 5, prepTimeMinutes: 60, leadTimeHours: 24 }),
    },
    deliveryZones: {
      type: [deliveryZoneSchema],
      default: [],
      validate: [(v: IDeliveryZone[]) => v.length <= 10, 'Max 10 delivery zones'],
    },
  },
  { timestamps: true },
)

export const ChefSchedule = mongoose.model<IChefSchedule>(
  'ChefSchedule',
  chefScheduleSchema,
  'chefschedules',
)
