import { Schema, model, Document, Types } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const DietaryPreferenceValues = [
  'HALAL', 'VEGETARIAN', 'VEGAN', 'EGGETARIAN',
  'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_CARB', 'KETO',
  'HIGH_PROTEIN', 'LOW_SODIUM', 'SUGAR_FREE',
] as const
export type DietaryPreference = typeof DietaryPreferenceValues[number]

export const AllergyValues = [
  'PEANUTS', 'TREE_NUTS', 'MILK_DAIRY', 'EGGS',
  'WHEAT_GLUTEN', 'FISH', 'SHELLFISH', 'SOY', 'SESAME',
] as const
export type Allergy = typeof AllergyValues[number]

export const DislikedIngredientValues = [
  'ONION', 'GARLIC', 'GINGER', 'CILANTRO', 'MINT',
  'GREEN_CHILI', 'RED_CHILI', 'CAPSICUM', 'TOMATO',
  'EGGPLANT', 'OKRA', 'TURNIP', 'RADISH', 'BITTER_GOURD',
] as const
export type DislikedIngredient = typeof DislikedIngredientValues[number]

export const SpiceLevelValues = ['MILD', 'MEDIUM', 'SPICY', 'EXTRA_SPICY'] as const
export type SpiceLevel = typeof SpiceLevelValues[number]

export const AddressLabelValues = ['HOME', 'WORK', 'OTHER'] as const
export type AddressLabel = typeof AddressLabelValues[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IAddress {
  _id: Types.ObjectId
  label: AddressLabel
  addressLine: string
  city: string
  postalCode?: string
  coordinates?: { lat: number; lng: number }
  deliveryInstructions?: string
  isDefault: boolean
}

export interface INotificationPreferences {
  orderUpdates: boolean
  promotions: boolean
  chefMessages: boolean
  email: boolean
}

export interface IFavorites {
  chefIds: string[]
  dishIds: string[]
}

export interface IUserProfile extends Document {
  userId: string
  firstName: string
  lastName: string
  phone?: string
  profileImage?: string
  dateOfBirth?: Date
  addresses: IAddress[]
  dietaryPreferences: DietaryPreference[]
  allergies: Allergy[]
  dislikedIngredients: DislikedIngredient[]
  spiceLevel: SpiceLevel
  favoriteCuisines: string[]
  notificationPreferences: INotificationPreferences
  favorites: IFavorites
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const addressSchema = new Schema<IAddress>(
  {
    label:                { type: String, enum: AddressLabelValues, required: true },
    addressLine:          { type: String, required: true },
    city:                 { type: String, required: true },
    postalCode:           { type: String },
    coordinates:          {
      type: new Schema({ lat: { type: Number }, lng: { type: Number } }, { _id: false }),
    },
    deliveryInstructions: { type: String, maxlength: 300 },
    isDefault:            { type: Boolean, default: false },
  },
  { _id: true },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const userProfileSchema = new Schema<IUserProfile>(
  {
    userId:       { type: String, required: true, unique: true },
    firstName:    { type: String, required: true },
    lastName:     { type: String, required: true },
    phone:        { type: String },
    profileImage: { type: String },
    dateOfBirth:  { type: Date },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: [
        (v: IAddress[]) => v.length <= 10,
        'Maximum of 10 addresses allowed',
      ],
    },
    dietaryPreferences: {
      type: [String],
      enum: DietaryPreferenceValues,
      default: ['HALAL'],
    },
    allergies: {
      type: [String],
      enum: AllergyValues,
      default: [],
    },
    dislikedIngredients: {
      type: [String],
      enum: DislikedIngredientValues,
      default: [],
    },
    spiceLevel: {
      type: String,
      enum: SpiceLevelValues,
      default: 'MEDIUM',
    },
    favoriteCuisines: { type: [String], default: [] },
    notificationPreferences: {
      orderUpdates:  { type: Boolean, default: true },
      promotions:    { type: Boolean, default: false },
      chefMessages:  { type: Boolean, default: true },
      email:         { type: Boolean, default: true },
    },
    favorites: {
      chefIds: { type: [String], default: [] },
      dishIds: { type: [String], default: [] },
    },
  },
  { timestamps: true },
)

export const UserProfile = model<IUserProfile>('UserProfile', userProfileSchema)
