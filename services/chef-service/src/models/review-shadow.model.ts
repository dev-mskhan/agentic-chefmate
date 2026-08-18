import mongoose, { Schema, Document } from 'mongoose'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type ReviewShadowStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED'

export interface IReviewShadow extends Document {
  reviewId: string
  chefId:   string
  dishId?:  string
  planId?:  string
  rating:   number
  status:   ReviewShadowStatus
}

// ─── Root schema ──────────────────────────────────────────────────────────────

const reviewShadowSchema = new Schema<IReviewShadow>(
  {
    reviewId: { type: String, required: true, unique: true },
    chefId:   { type: String, required: true },
    dishId:   { type: String },
    planId:   { type: String },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    status:   { type: String, required: true, default: 'PUBLISHED' },
  },
  { timestamps: false },
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

reviewShadowSchema.index({ reviewId: 1 }, { unique: true })
reviewShadowSchema.index({ chefId: 1, status: 1 })
reviewShadowSchema.index({ dishId: 1, status: 1 }, { sparse: true })
reviewShadowSchema.index({ planId: 1, status: 1 }, { sparse: true })

export const ReviewShadow = mongoose.model<IReviewShadow>(
  'ReviewShadow',
  reviewShadowSchema,
  'reviewshadows',
)
