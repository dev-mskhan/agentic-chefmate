import mongoose, { Schema, Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ChefVerificationStatusValues = [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'REJECTED',
] as const
export type ChefVerificationStatus = typeof ChefVerificationStatusValues[number]

export const ChefAccountStateValues = [
  'INACTIVE',
  'ACTIVE',
  'PAUSED',
  'DELETED',
] as const
export type ChefAccountState = typeof ChefAccountStateValues[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IServiceArea {
  city?: string
  postalCodes: string[]
  coordinates?: { lat: number; lng: number }
  radiusKm?: number
  location?: { type: 'Point'; coordinates: [number, number] }
}

export interface IChefProfile extends Document {
  userId: string
  displayName: string
  bio?: string
  phone?: string
  cuisineSpecialties: string[]
  verificationStatus: ChefVerificationStatus
  accountState: ChefAccountState
  serviceArea?: IServiceArea
  portfolioMediaIds: string[]
  averageRating?: number
  totalReviews?: number
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const geoJsonPointSchema = new Schema(
  {
    type:        { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
)

const coordinatesSchema = new Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false },
)

const serviceAreaSchema = new Schema<IServiceArea>(
  {
    city:        { type: String },
    postalCodes: { type: [String], default: [] },
    coordinates: { type: coordinatesSchema },
    radiusKm:    { type: Number, min: 1, max: 200 },
    location:    { type: geoJsonPointSchema, required: false },
  },
  { _id: false },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const chefProfileSchema = new Schema<IChefProfile>(
  {
    userId: {
      type:     String,
      required: true,
      unique:   true,
    },
    displayName: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 2,
      maxlength: 60,
    },
    bio:   { type: String, maxlength: 1000 },
    phone: { type: String },
    cuisineSpecialties: {
      type:    [String],
      default: [],
    },
    verificationStatus: {
      type:    String,
      enum:    ChefVerificationStatusValues,
      default: 'PENDING',
    },
    accountState: {
      type:    String,
      enum:    ChefAccountStateValues,
      default: 'INACTIVE',
    },
    serviceArea:       { type: serviceAreaSchema },
    portfolioMediaIds: { type: [String], default: [] },
    averageRating:     { type: Number, min: 0, max: 5, default: 0 },
    totalReviews:      { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
)

// Unique index on userId (also enforced in schema definition above)
chefProfileSchema.index({ userId: 1 }, { unique: true })

// Sparse 2dsphere index for future geo queries
chefProfileSchema.index({ 'serviceArea.coordinates': '2dsphere' }, { sparse: true })

// Sparse 2dsphere index on GeoJSON location field for $geoNear aggregation
chefProfileSchema.index({ 'serviceArea.location': '2dsphere' }, { sparse: true })

// Compound text index for deterministic keyword search
chefProfileSchema.index(
  { displayName: 'text', bio: 'text', cuisineSpecialties: 'text' },
  { weights: { displayName: 10, bio: 5, cuisineSpecialties: 8 }, name: 'chefprofile_text_search' },
)

export const ChefProfile = mongoose.model<IChefProfile>('ChefProfile', chefProfileSchema, 'chefprofiles')
