import mongoose from 'mongoose'
// stripeClientSecret intentionally omitted — never exposed to admin clients
const s = new mongoose.Schema(
  { orderId: String, customerId: String, amountCents: Number, currency: String, status: String, refundedAmountCents: Number, stripePaymentIntentId: String, createdAt: Date },
  { strict: false },
)
export const AdminPayment =
  (mongoose.models['AdminPayment'] as mongoose.Model<any>) ||
  mongoose.model('AdminPayment', s, 'payments')
