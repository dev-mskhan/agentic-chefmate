import mongoose from 'mongoose'
const chefReplySchema = new mongoose.Schema({ text: String, createdAt: Date }, { _id: false })
const s = new mongoose.Schema(
  { customerId: String, chefId: String, orderId: String, rating: Number, text: String, status: String, chefReply: chefReplySchema, createdAt: Date },
  { strict: false },
)
export const AdminReview =
  (mongoose.models['AdminReview'] as mongoose.Model<any>) ||
  mongoose.model('AdminReview', s, 'reviews')
