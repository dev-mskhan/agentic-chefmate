import mongoose from 'mongoose'
const s = new mongoose.Schema(
  { userId: String, firstName: String, lastName: String, phone: String, createdAt: Date },
  { strict: false },
)
export const AdminUserProfile =
  (mongoose.models['AdminUserProfile'] as mongoose.Model<any>) ||
  mongoose.model('AdminUserProfile', s, 'userprofiles')
