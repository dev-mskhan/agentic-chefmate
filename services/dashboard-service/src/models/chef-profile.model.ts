import mongoose from 'mongoose'

const s = new mongoose.Schema(
  { userId: String, averageRating: Number, totalReviews: Number },
  { strict: false },
)

export const ChefProfile =
  (mongoose.models['DashChefProfile'] as mongoose.Model<any>) ||
  mongoose.model('DashChefProfile', s, 'chefprofiles')
