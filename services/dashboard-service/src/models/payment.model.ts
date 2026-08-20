import mongoose from 'mongoose'
const s = new mongoose.Schema(
  { customerId: String, orderId: String, amountCents: Number, currency: String, status: String, refundedAmountCents: Number, createdAt: Date },
  { strict: false },
)
export const Payment = (mongoose.models['DashPayment'] as mongoose.Model<any>) || mongoose.model('DashPayment', s, 'payments')
