import mongoose from 'mongoose'
const pricingSchema = new mongoose.Schema({ total: Number, currency: String }, { _id: false })
const s = new mongoose.Schema(
  { customerId: String, chefId: String, status: String, orderType: String, pricing: pricingSchema, items: [mongoose.Schema.Types.Mixed], createdAt: Date },
  { strict: false },
)
export const AdminOrder =
  (mongoose.models['AdminOrder'] as mongoose.Model<any>) ||
  mongoose.model('AdminOrder', s, 'orders')
