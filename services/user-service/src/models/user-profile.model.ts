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

/**
 * Canonical cuisine categories — mirrors Chef Service Phase 4 constants.
 * Kept here so User Service has no dependency on chef-service package.
 * Must be kept in sync when Chef Service adds new cuisines.
 */
export const CuisineCategoryValues = [
  'PAKISTANI', 'PUNJABI', 'SINDHI', 'BALOCHI', 'PASHTUN',
  'KARAHI', 'BBQ', 'NORTH_INDIAN', 'SOUTH_INDIAN',
  'MIDDLE_EASTERN', 'CHINESE', 'ITALIAN', 'CONTINENTAL',
] as const
export type CuisineCategory = typeof CuisineCategoryValues[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * GeoJSON Point for 2dsphere queries.
 * coordinates: [longitude, latitude] — note longitude first (GeoJSON spec).
 */
export interface IGeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface IAddress {
  _id: Types.ObjectId
  label: AddressLabel
  addressLine: string
  area?: string          // Locality / area (e.g. DHA Phase 5, Gulberg III)
  city: string
  province?: string      // Pakistani province (e.g. Punjab, Sindh)
  postalCode?: string
  location?: IGeoPoint   // GeoJSON — replaces old lat/lng coordinates
  deliveryInstructions?: string
  isDefault: boolean
}

export interface INotificationChannels {
  push:   boolean
  email:  boolean
  sms:    boolean
  inApp:  boolean
}

export interface INotificationCategories {
  orderUpdates:         boolean
  chefMessages:         boolean
  promotions:           boolean
  subscriptionUpdates:  boolean
  paymentUpdates:       boolean
}

export interface IQuietHours {
  enabled: boolean
  start:   string   // HH:MM
  end:     string   // HH:MM
}

export interface INotificationPreferences {
  channels:   INotificationChannels
  categories: INotificationCategories
  quietHours: IQuietHours
}

export interface IFavorites {
  chefIds:  string[]
  dishIds:  string[]
  planIds:  string[]  // Added: meal plan favorites
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
  favoriteCuisines: CuisineCategory[]
  notificationPreferences: INotificationPreferences
  favorites: IFavorites
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const geoPointSchema = new Schema<IGeoPoint>(
  {
    type:        { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
)

const addressSchema = new Schema<IAddress>(
  {
    label:                { type: String, enum: AddressLabelValues, required: true },
    addressLine:          { type: String, required: true },
    area:                 { type: String, maxlength: 100 },
    city:                 { type: String, required: true },
    province:             { type: String, maxlength: 60 },
    postalCode:           { type: String },
    location:             { type: geoPointSchema },   // GeoJSON Point
    deliveryInstructions: { type: String, maxlength: 300 },
    isDefault:            { type: Boolean, default: false },
  },
  { _id: true },
)

const notifChannelsSchema = new Schema<INotificationChannels>(
  {
    push:  { type: Boolean, default: true  },
    email: { type: Boolean, default: true  },
    sms:   { type: Boolean, default: false },
    inApp: { type: Boolean, default: true  },
  },
  { _id: false },
)

const notifCategoriesSchema = new Schema<INotificationCategories>(
  {
    orderUpdates:        { type: Boolean, default: true  },
    chefMessages:        { type: Boolean, default: true  },
    promotions:          { type: Boolean, default: false },
    subscriptionUpdates: { type: Boolean, default: true  },
    paymentUpdates:      { type: Boolean, default: true  },
  },
  { _id: false },
)

const quietHoursSchema = new Schema<IQuietHours>(
  {
    enabled: { type: Boolean, default: false },
    start:   { type: String, default: '22:00' },
    end:     { type: String, default: '08:00' },
  },
  { _id: false },
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
      type:    [String],
      enum:    DietaryPreferenceValues,
      default: ['HALAL'],
    },
    allergies: {
      type:    [String],
      enum:    AllergyValues,
      default: [],
    },
    dislikedIngredients: {
      type:    [String],
      enum:    DislikedIngredientValues,
      default: [],
    },
    spiceLevel: {
      type:    String,
      enum:    SpiceLevelValues,
      default: 'MEDIUM',
    },
    favoriteCuisines: {
      type:    [String],
      enum:    CuisineCategoryValues,   // now validated against canonical taxonomy
      default: [],
    },
    notificationPreferences: {
      type: new Schema(
        {
          channels:   { type: notifChannelsSchema,    default: () => ({}) },
          categories: { type: notifCategoriesSchema,  default: () => ({}) },
          quietHours: { type: quietHoursSchema,       default: () => ({}) },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    favorites: {
      chefIds: { type: [String], default: [] },
      dishIds: { type: [String], default: [] },
      planIds: { type: [String], default: [] },   // NEW
    },
  },
  { timestamps: true },
)

// Sparse 2dsphere index for geo queries on addresses
userProfileSchema.index({ 'addresses.location': '2dsphere' }, { sparse: true })

export const UserProfile = model<IUserProfile>('UserProfile', userProfileSchema)
