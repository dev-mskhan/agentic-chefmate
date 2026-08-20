import mongoose from 'mongoose'

const s = new mongoose.Schema(
  {
    chefId: String,
    type: String,
    grossAmountCents: Number,
    platformFeeCents: Number,
    netAmountCents: Number,
    currency: String,
    status: String,
    createdAt: Date,
  },
  { strict: false },
)

export const EarningsLedger =
  (mongoose.models['DashEarnings'] as mongoose.Model<any>) ||
  mongoose.model('DashEarnings', s, 'earningsledger')
