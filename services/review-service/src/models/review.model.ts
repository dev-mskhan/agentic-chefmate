import mongoose, { Schema, Document } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ReviewStatusValues = ['PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED'] as const
export type ReviewStatus = typeof ReviewStatusValues[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IChefReply {
  text: string
  createdAt: Date
}

export interface IReview extends Document {
  customerId: string
  chefId: string
  dishId?: string
  planId?: string
  orderId: string
  rating: number
  text?: string
  verifiedPurchase: boolean
  status: ReviewStatus
  chefReply?: IChefReply
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const chefReplySchema = new Schema<IChefReply>(
  {
    text:      { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const reviewSchema = new Schema<IReview>(
  {
    customerId: { type: String, required: true },
    chefId:     { type: String, required: true },
    dishId:     { type: String },
    planId:     { type: String },
    orderId:    { type: String, required: true },
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message:   'Rating must be an integer',
      },
    },
    text:             { type: String, maxlength: 1000 },
    verifiedPurchase: { type: Boolean, required: true, default: false },
    status: {
      type:    String,
      enum:    ReviewStatusValues,
      default: 'PUBLISHED',
      required: true,
    },
    chefReply: { type: chefReplySchema },
  },
  { timestamps: true },
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique: prevent duplicate chef-level reviews per customer per order
reviewSchema.index({ customerId: 1, orderId: 1, chefId: 1 }, { unique: true })

// Unique sparse: prevent duplicate dish-level reviews per customer per order
reviewSchema.index({ customerId: 1, orderId: 1, dishId: 1 }, { unique: true, sparse: true })

// Unique sparse: prevent duplicate plan-level reviews per customer per order
reviewSchema.index({ customerId: 1, orderId: 1, planId: 1 }, { unique: true, sparse: true })

// Non-unique: paginated chef review listing
reviewSchema.index({ chefId: 1, status: 1, createdAt: -1 })

// Non-unique sparse: paginated dish review listing
reviewSchema.index({ dishId: 1, status: 1, createdAt: -1 }, { sparse: true })

// Non-unique sparse: paginated plan review listing
reviewSchema.index({ planId: 1, status: 1, createdAt: -1 }, { sparse: true })

export const Review = mongoose.model<IReview>('Review', reviewSchema, 'reviews')
