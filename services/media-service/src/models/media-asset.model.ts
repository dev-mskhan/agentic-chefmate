import { Schema, model, Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const MediaStatusValues = [
  'PENDING',
  'UPLOADING',
  'READY',
  'FAILED',
  'DELETED',
] as const

export type MediaStatus = (typeof MediaStatusValues)[number]

export const MediaOwnerTypeValues = ['chef', 'dish', 'plan'] as const

export type MediaOwnerType = (typeof MediaOwnerTypeValues)[number]

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMediaAsset extends Document {
  mediaId: string
  ownerId: string
  ownerType: MediaOwnerType
  status: MediaStatus
  objectKey?: string
  thumbnailKey?: string
  mimeType: string
  sizeBytes: number
  originalName?: string
  width?: number
  height?: number
  durationSeconds?: number
  createdAt: Date
  updatedAt: Date
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    mediaId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    ownerType: { type: String, enum: MediaOwnerTypeValues, required: true },
    status: { type: String, enum: MediaStatusValues, default: 'PENDING' },
    objectKey: { type: String },
    thumbnailKey: { type: String },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    originalName: { type: String },
    width: { type: Number },
    height: { type: Number },
    durationSeconds: { type: Number },
  },
  { timestamps: true },
)

// Compound index for owner-scoped queries
mediaAssetSchema.index({ ownerId: 1, ownerType: 1, status: 1 })

export const MediaAsset = model<IMediaAsset>('MediaAsset', mediaAssetSchema, 'mediaassets')
