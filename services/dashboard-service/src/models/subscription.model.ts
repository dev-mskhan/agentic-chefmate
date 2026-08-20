import mongoose from 'mongoose'

const ps = new mongoose.Schema(
  { amountCents: Number, currency: String },
  { _id: false },
)

const s = new mongoose.Schema(
  {
    chefId: String,
    planId: String,
    status: String,
    priceSnapshot: ps,
    createdAt: Date,
  },
  { strict: false },
)

export const Subscription =
  (mongoose.models['DashSubscription'] as mongoose.Model<any>) ||
  mongoose.model('DashSubscription', s, 'subscriptions')
