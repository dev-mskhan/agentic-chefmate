import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IRefreshToken extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  tokenHash: string
  family: string
  expiresAt: Date
  revokedAt?: Date
  createdAt: Date
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true },
)

// TTL index — MongoDB auto-deletes expired tokens (no cron needed)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema,
)
