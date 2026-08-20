import mongoose from 'mongoose'
const s = new mongoose.Schema(
  { chefId: String, type: String, grossAmountCents: Number, platformFeeCents: Number, netAmountCents: Number, currency: String, status: String, createdAt: Date },
  { strict: false },
)
export const AdminEarningsLedger =
  (mongoose.models['AdminEarningsLedger'] as mongoose.Model<any>) ||
  mongoose.model('AdminEarningsLedger', s, 'earningsledger')
