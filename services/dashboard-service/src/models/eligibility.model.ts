import mongoose from 'mongoose'
const itemSchema = new mongoose.Schema({ dishId: String, planId: String }, { _id: false })
const s = new mongoose.Schema({ orderId: String, customerId: String, items: [itemSchema] }, { strict: false })
export const Eligibility = (mongoose.models['DashEligibility'] as mongoose.Model<any>) || mongoose.model('DashEligibility', s, 'completedordereligibilities')
