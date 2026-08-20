import mongoose from 'mongoose'
const favSchema = new mongoose.Schema({ chefIds: [String], dishIds: [String], planIds: [String] }, { _id: false })
const s = new mongoose.Schema(
  { userId: String, firstName: String, lastName: String, addresses: [mongoose.Schema.Types.Mixed], favorites: favSchema, dietaryPreferences: [String], allergies: [String], spiceLevel: String },
  { strict: false },
)
export const DashUserProfile = (mongoose.models['DashUserProfile'] as mongoose.Model<any>) || mongoose.model('DashUserProfile', s, 'userprofiles')
