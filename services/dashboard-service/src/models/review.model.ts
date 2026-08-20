import mongoose from 'mongoose'

const s = new mongoose.Schema(
  {
    chefId: String,
    customerId: String,
    rating: Number,
    text: String,
    status: String,
    createdAt: Date,
  },
  { strict: false },
)

export const Review =
  (mongoose.models['DashReview'] as mongoose.Model<any>) ||
  mongoose.model('DashReview', s, 'reviews')
