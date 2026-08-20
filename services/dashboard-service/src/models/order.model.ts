import mongoose from 'mongoose'

const pricingSchema = new mongoose.Schema(
  { total: Number, currency: String },
  { _id: false },
)

const itemSchema = new mongoose.Schema(
  { dishId: String, name: String, quantity: Number, unitPrice: Number, subtotal: Number },
  { _id: false },
)

const s = new mongoose.Schema(
  {
    chefId: String,
    customerId: String,
    status: String,
    orderType: String,
    pricing: pricingSchema,
    items: [itemSchema],
    createdAt: Date,
  },
  { strict: false },
)

export const Order =
  (mongoose.models['DashOrder'] as mongoose.Model<any>) ||
  mongoose.model('DashOrder', s, 'orders')
