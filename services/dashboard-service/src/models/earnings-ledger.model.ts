import mongoose from 'mongoose'

const s = new mongoose.Schema(
  {
    chefId: { type: String, required: true },
    orderId: String,
    paymentId: String,
    type: { type: String, enum: ['CREDIT', 'DEBIT', 'HOLD', 'HOLD_RELEASE'], required: true },
    grossAmountCents: Number,
    platformFeeCents: Number,
    netAmountCents: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'AVAILABLE', 'TRANSFERRED', 'REFUNDED'] },
    availableAt: Date,
    idempotencyKey: String,
    createdAt: Date,
    updatedAt: Date,
  },
  { strict: false },
)

s.index({ chefId: 1, createdAt: -1 })
s.index({ chefId: 1, status: 1, type: 1 })

export const EarningsLedger =
  (mongoose.models['DashEarnings'] as mongoose.Model<any>) ||
  mongoose.model('DashEarnings', s, 'earningsledger')
