import mongoose from 'mongoose'
const ps = new mongoose.Schema({ amountCents: Number, currency: String }, { _id: false })
const s = new mongoose.Schema(
  { customerId: String, chefId: String, planId: String, status: String, priceSnapshot: ps, createdAt: Date },
  { strict: false },
)
export const AdminSubscription =
  (mongoose.models['AdminSubscription'] as mongoose.Model<any>) ||
  mongoose.model('AdminSubscription', s, 'subscriptions')
