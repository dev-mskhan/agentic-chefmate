import mongoose from 'mongoose'

const ps = new mongoose.Schema(
  { amountCents: Number, currency: String },
  { _id: false },
)

const s = new mongoose.Schema(
  {
    customerId: String,
    chefId: String,
    planId: String,
    status: String,
    frequency: String,
    priceSnapshot: ps,
    createdAt: Date,
  },
  { strict: false },
)

s.index({ customerId: 1, status: 1 })
s.index({ chefId: 1, status: 1 })

export const Subscription =
  (mongoose.models['DashSubscription'] as mongoose.Model<any>) ||
  mongoose.model('DashSubscription', s, 'subscriptions')
