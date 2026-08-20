import mongoose from 'mongoose'
const s = new mongoose.Schema(
  { userId: String, displayName: String, bio: String, verificationStatus: String, accountState: String, cuisineSpecialties: [String], averageRating: Number, totalReviews: Number, createdAt: Date },
  { strict: false },
)
export const AdminChefProfile =
  (mongoose.models['AdminChefProfile'] as mongoose.Model<any>) ||
  mongoose.model('AdminChefProfile', s, 'chefprofiles')
