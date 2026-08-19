/**
 * Read-only access to the Payment collection from the shared MongoDB.
 * Payout-service does NOT own payments — it only reads them for settlement.
 */
import mongoose, { Schema } from 'mongoose'

const paymentReadSchema = new Schema(
  { orderId: String, customerId: String, amountCents: Number, currency: String, status: String },
  { strict: false },
)

export const Payment = mongoose.models['PaymentRef'] ||
  mongoose.model('PaymentRef', paymentReadSchema, 'payments')
