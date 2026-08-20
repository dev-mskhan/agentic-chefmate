import mongoose from 'mongoose'

const chefReplySchema = new mongoose.Schema({ text: String, createdAt: Date }, { _id: false })

const s = new mongoose.Schema(
  {
    customerId: String,
    chefId:     String,
    dishId:     String,
    planId:     String,
    orderId:    String,
    rating:     Number,
    text:       String,
    status:     String,
    chefReply:  chefReplySchema,
    createdAt:  Date,
  },
  { strict: false },
)

export const Review =
  (mongoose.models['DashReview'] as mongoose.Model<any>) ||
  mongoose.model('DashReview', s, 'reviews')
