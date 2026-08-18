import mongoose, { Schema, Document } from 'mongoose'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IEligibilityItem {
  dishId: string
  planId?: string
}

export interface ICompletedOrderEligibility extends Document {
  orderId: string
  customerId: string
  chefId: string
  items: IEligibilityItem[]
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const eligibilityItemSchema = new Schema<IEligibilityItem>(
  {
    dishId: { type: String, required: true },
    planId: { type: String },
  },
  { _id: false },
)

// ─── Root schema ──────────────────────────────────────────────────────────────

const completedOrderEligibilitySchema = new Schema<ICompletedOrderEligibility>(
  {
    orderId:    { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    chefId:     { type: String, required: true },
    items:      { type: [eligibilityItemSchema], default: [] },
  },
  { timestamps: true },
)

// Unique index on orderId for O(1) lookup and upsert idempotency
completedOrderEligibilitySchema.index({ orderId: 1 }, { unique: true })

export const CompletedOrderEligibility = mongoose.model<ICompletedOrderEligibility>(
  'CompletedOrderEligibility',
  completedOrderEligibilitySchema,
  'completedordereligibilities',
)
