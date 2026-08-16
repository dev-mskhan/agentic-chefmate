import mongoose, { Schema, Document } from 'mongoose'

export const PeriodStatusValues = ['PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'] as const
export type PeriodStatus = typeof PeriodStatusValues[number]

export interface ISubscriptionPeriod extends Document {
  subscriptionId: string
  periodStart:    string   // YYYY-MM-DD
  periodEnd:      string   // YYYY-MM-DD
  orderId?:       string
  paymentId?:     string
  status:         PeriodStatus
  idempotencyKey: string   // sub_{subscriptionId}_{periodStart}
  createdAt:      Date
}

const subscriptionPeriodSchema = new Schema<ISubscriptionPeriod>(
  {
    subscriptionId: { type: String, required: true },
    periodStart:    { type: String, required: true },
    periodEnd:      { type: String, required: true },
    orderId:        { type: String },
    paymentId:      { type: String },
    status:         { type: String, enum: PeriodStatusValues, default: 'PENDING' },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

subscriptionPeriodSchema.index({ subscriptionId: 1, periodStart: 1 }, { unique: true })
subscriptionPeriodSchema.index({ idempotencyKey: 1 }, { unique: true })

export const SubscriptionPeriod = mongoose.model<ISubscriptionPeriod>(
  'SubscriptionPeriod',
  subscriptionPeriodSchema,
  'subscriptionperiods',
)
