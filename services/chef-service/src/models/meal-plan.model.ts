import mongoose, { Schema, Document } from 'mongoose'
import { ALLOWED_CURRENCIES, WEEK_DAYS } from './dish.model'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PlanTypeValues = ['ONE_OFF', 'SUBSCRIPTION'] as const
export type PlanType = typeof PlanTypeValues[number]

export const PlanFrequencyValues = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
export type PlanFrequency = typeof PlanFrequencyValues[number]

export const PlanStatusValues = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const
export type PlanStatus = typeof PlanStatusValues[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IPlanTier {
  name: string
  description?: string
  dishIds: string[]
  portionsPerDish?: number
  priceOverride?: number
  notes?: string
}

export interface IAvailabilityRules {
  startDate?: string
  endDate?: string
  availableDays: string[]
  maxSubscribers?: number
}

export interface IPauseRules {
  allowPause: boolean
  maxPauseDays?: number
}

export interface ISkipRules {
  allowSkip: boolean
  minNoticeHours?: number
}

export interface ISwapRules {
  allowSwap: boolean
  swapWindowHours?: number
}

export interface IMealPlan extends Document {
  chefId: string
  name: string
  description?: string
  type: PlanType
  frequency?: PlanFrequency
  status: PlanStatus
  tiers: IPlanTier[]
  basePrice?: number
  currency: string
  availabilityRules: IAvailabilityRules
  pauseRules: IPauseRules
  skipRules: ISkipRules
  swapRules: ISwapRules
  mediaIds: string[]
  averageRating?: number
  totalReviews?: number
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const planTierSchema = new Schema<IPlanTier>(
  {
    name:            { type: String, required: true, maxlength: 60 },
    description:     { type: String, maxlength: 300 },
    dishIds: {
      type: [String],
      required: true,
      validate: [
        (v: string[]) => v.length >= 1 && v.length <= 20,
        'Each tier must have 1–20 dish references',
      ],
    },
    portionsPerDish: { type: Number, min: 1, max: 99 },
    priceOverride:   { type: Number, min: 0.01 },
    notes:           { type: String, maxlength: 200 },
  },
  { _id: true },
)

const availabilityRulesSchema = new Schema<IAvailabilityRules>(
  {
    startDate:      { type: String },
    endDate:        { type: String },
    availableDays:  { type: [String], enum: WEEK_DAYS, default: [...WEEK_DAYS] },
    maxSubscribers: { type: Number, min: 1 },
  },
  { _id: false },
)

const pauseRulesSchema = new Schema<IPauseRules>(
  {
    allowPause:   { type: Boolean, default: true },
    maxPauseDays: { type: Number, min: 1, max: 90 },
  },
  { _id: false },
)

const skipRulesSchema = new Schema<ISkipRules>(
  {
    allowSkip:      { type: Boolean, default: true },
    minNoticeHours: { type: Number, min: 1, max: 168 },
  },
  { _id: false },
)

const swapRulesSchema = new Schema<ISwapRules>(
  {
    allowSwap:       { type: Boolean, default: true },
    swapWindowHours: { type: Number, min: 1, max: 72 },
  },
  { _id: false },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const mealPlanSchema = new Schema<IMealPlan>(
  {
    chefId:      { type: String, required: true, index: true },
    name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, maxlength: 1000 },
    type:        { type: String, enum: PlanTypeValues, required: true },
    frequency:   { type: String, enum: PlanFrequencyValues },
    status:      { type: String, enum: PlanStatusValues, default: 'DRAFT' },
    tiers: {
      type: [planTierSchema],
      default: [],
      validate: [(v: IPlanTier[]) => v.length <= 5, 'Max 5 tiers per plan'],
    },
    basePrice:         { type: Number, min: 0.01 },
    currency:          { type: String, enum: ALLOWED_CURRENCIES, default: 'PKR' },
    availabilityRules: { type: availabilityRulesSchema, default: () => ({}) },
    pauseRules:        { type: pauseRulesSchema, default: () => ({ allowPause: true }) },
    skipRules:         { type: skipRulesSchema,  default: () => ({ allowSkip: true }) },
    swapRules:         { type: swapRulesSchema,  default: () => ({ allowSwap: true }) },
    mediaIds: {
      type: [String],
      default: [],
      validate: [(v: string[]) => v.length <= 5, 'Max 5 media references per plan'],
    },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    totalReviews:  { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
)

mealPlanSchema.index({ chefId: 1, status: 1 })
mealPlanSchema.index({ chefId: 1, type: 1 })

export const MealPlan = mongoose.model<IMealPlan>('MealPlan', mealPlanSchema, 'mealplans')
