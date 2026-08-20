import mongoose from 'mongoose'

const s = new mongoose.Schema(
  {
    chefId: String,
    amountCents: Number,
    currency: String,
    status: String,
    stripePayoutId: String,
    failureReason: String,
    createdAt: Date,
  },
  { strict: false },
)

export const Payout =
  (mongoose.models['DashPayout'] as mongoose.Model<any>) ||
  mongoose.model('DashPayout', s, 'payouts')
