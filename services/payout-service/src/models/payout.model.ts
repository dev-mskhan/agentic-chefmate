import mongoose, { Schema, Document } from 'mongoose'

export const PayoutStatusValues = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'] as const
export type PayoutStatus = typeof PayoutStatusValues[number]

export interface IPayout extends Document {
  chefId:            string
  stripeAccountId:   string
  amountCents:       number
  currency:          string
  status:            PayoutStatus
  stripeTransferId?: string
  stripePayoutId?:   string
  failureReason?:    string
  createdAt:         Date
  updatedAt:         Date
}

const payoutSchema = new Schema<IPayout>(
  {
    chefId:           { type: String, required: true },
    stripeAccountId:  { type: String, required: true },
    amountCents:      { type: Number, required: true, min: 1 },
    currency:         { type: String, required: true },
    status:           { type: String, enum: PayoutStatusValues, default: 'PENDING' },
    stripeTransferId: { type: String },
    stripePayoutId:   { type: String },
    failureReason:    { type: String },
  },
  { timestamps: true },
)

payoutSchema.index({ chefId: 1, createdAt: -1 })
payoutSchema.index({ stripeTransferId: 1 }, { unique: true, sparse: true })
payoutSchema.index({ stripePayoutId: 1 },   { unique: true, sparse: true })

export const Payout = mongoose.model<IPayout>('Payout', payoutSchema, 'payouts')
