import mongoose, { Schema, Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const DietaryTagValues = [
  'HALAL', 'VEGETARIAN', 'VEGAN', 'EGGETARIAN',
  'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_CARB', 'KETO', 'HIGH_PROTEIN',
] as const
export type DietaryTag = typeof DietaryTagValues[number]

export const AllergenValues = [
  'PEANUTS', 'TREE_NUTS', 'MILK_DAIRY', 'EGGS',
  'WHEAT_GLUTEN', 'FISH', 'SHELLFISH', 'SOY', 'SESAME',
] as const
export type Allergen = typeof AllergenValues[number]

export const OccasionTagValues = [
  'WEEKNIGHT', 'DATE_NIGHT', 'MEAL_PREP', 'FAMILY',
  'PARTY', 'OFFICE_LUNCH', 'IFTAR', 'SEHRI',
] as const
export type OccasionTag = typeof OccasionTagValues[number]

export const DishStatusValues = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const
export type DishStatus = typeof DishStatusValues[number]

export const ALLOWED_CURRENCIES = ['PKR', 'USD', 'GBP', 'AED', 'SAR'] as const
export type AllowedCurrency = typeof ALLOWED_CURRENCIES[number]

export const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export type WeekDay = typeof WEEK_DAYS[number]

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IIngredient {
  name: string
  quantity: number
  unit: string
}

export interface IAvailability {
  isAvailable: boolean
  availableDays: string[]
  availableFrom?: string
  availableUntil?: string
}

export interface IDish extends Document {
  chefId: string
  name: string
  description?: string
  ingredients: IIngredient[]
  price: number
  currency: string
  portionInfo?: string
  dietaryTags: DietaryTag[]
  allergens: Allergen[]
  cuisine?: string
  category?: string
  occasionTags: OccasionTag[]
  mediaIds: string[]
  availability: IAvailability
  status: DishStatus
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const ingredientSchema = new Schema<IIngredient>(
  {
    name:     { type: String, required: true, maxlength: 80 },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit:     { type: String, required: true, maxlength: 20 },
  },
  { _id: false },
)

const availabilitySchema = new Schema<IAvailability>(
  {
    isAvailable:    { type: Boolean, default: true },
    availableDays:  { type: [String], enum: WEEK_DAYS, default: [...WEEK_DAYS] },
    availableFrom:  { type: String },
    availableUntil: { type: String },
  },
  { _id: false },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const dishSchema = new Schema<IDish>(
  {
    chefId:      { type: String, required: true, index: true },
    name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    ingredients: {
      type:     [ingredientSchema],
      default:  [],
      validate: [(v: IIngredient[]) => v.length <= 50, 'Max 50 ingredients'],
    },
    price:       { type: Number, required: true, min: 0.01 },
    currency:    { type: String, enum: ALLOWED_CURRENCIES, default: 'PKR' },
    portionInfo: { type: String, maxlength: 200 },
    dietaryTags: { type: [String], enum: DietaryTagValues, default: [] },
    allergens:   { type: [String], enum: AllergenValues, default: [] },
    cuisine:     { type: String },
    category:    { type: String, maxlength: 60 },
    occasionTags:{ type: [String], enum: OccasionTagValues, default: [] },
    mediaIds:    {
      type:     [String],
      default:  [],
      validate: [(v: string[]) => v.length <= 10, 'Max 10 media references'],
    },
    availability: { type: availabilitySchema, default: () => ({}) },
    status:      { type: String, enum: DishStatusValues, default: 'DRAFT' },
  },
  { timestamps: true },
)

dishSchema.index({ chefId: 1, status: 1 })
dishSchema.index({ chefId: 1, cuisine: 1 })
dishSchema.index({ name: 'text' })

export const Dish = mongoose.model<IDish>('Dish', dishSchema, 'dishes')
