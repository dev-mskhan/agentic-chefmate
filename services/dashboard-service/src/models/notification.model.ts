import mongoose from 'mongoose'
const s = new mongoose.Schema(
  { userId: String, type: String, title: String, message: String, readAt: { type: Date, default: null }, status: String, createdAt: Date },
  { strict: false },
)
export const DashNotification = (mongoose.models['DashNotification'] as mongoose.Model<any>) || mongoose.model('DashNotification', s, 'notifications')
