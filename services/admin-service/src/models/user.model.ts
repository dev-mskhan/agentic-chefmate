import mongoose from 'mongoose'
// Read-only view of auth-service 'users' collection. passwordHash excluded from schema.
const s = new mongoose.Schema(
  { email: String, role: String, emailVerified: Boolean, isSuspended: { type: Boolean, default: false }, suspendedAt: Date, googleId: String, createdAt: Date },
  { strict: false },
)
export const AdminUser =
  (mongoose.models['AdminUser'] as mongoose.Model<any>) ||
  mongoose.model('AdminUser', s, 'users')
