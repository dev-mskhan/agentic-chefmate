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
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

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
  },
  { timestamps: true },
)

// Unique index on userId (also enforced in schema definition above)
chefProfileSchema.index({ userId: 1 }, { unique: true })

// Sparse 2dsphere index for future geo queries
chefProfileSchema.index({ 'serviceArea.coordinates': '2dsphere' }, { sparse: true })

export const ChefProfile = mongoose.model<IChefProfile>('ChefProfile', chefProfileSchema, 'chefprofiles')
