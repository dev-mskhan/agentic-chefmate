import mongoose, { Schema, Document } from 'mongoose'

export const PaymentStatusValues = [
  'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED',
] as const
export type PaymentStatus = typeof PaymentStatusValues[number]

export interface IPayment extends Document {
  orderId:                   string
  customerId:                string
  amountCents:               number
  currency:                  string
  status:                    PaymentStatus
  provider:                  'STRIPE'
  stripePaymentIntentId?:    string
  stripeClientSecret?:       string
  failureReason?:            string
  refundedAmountCents:       number
  metadata:                  Record<string, unknown>
  createdAt:                 Date
  updatedAt:                 Date
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId:                { type: String, required: true, unique: true },
    customerId:             { type: String, required: true },
    amountCents:            { type: Number, required: true, min: 0 },
    currency:               { type: String, required: true },
    status:                 { type: String, enum: PaymentStatusValues, default: 'PENDING' },
    provider:               { type: String, default: 'STRIPE' },
    stripePaymentIntentId:  { type: String, sparse: true },
    stripeClientSecret:     { type: String },
    failureReason:          { type: String },
    refundedAmountCents:    { type: Number, default: 0, min: 0 },
    metadata:               { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

paymentSchema.index({ orderId: 1 }, { unique: true })
paymentSchema.index({ customerId: 1, createdAt: -1 })
paymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true })
paymentSchema.index({ status: 1, createdAt: -1 })

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema, 'payments')
