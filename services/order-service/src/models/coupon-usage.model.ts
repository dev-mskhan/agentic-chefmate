import mongoose, { Schema, Document } from 'mongoose'

export interface ICouponUsage extends Document {
  couponId:   string
  customerId: string
  orderId:    string
  usedAt:     Date
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId:   { type: String, required: true },
    customerId: { type: String, required: true },
    orderId:    { type: String, required: true, unique: true },
    usedAt:     { type: Date, default: () => new Date() },
  },
  { timestamps: false },
)

couponUsageSchema.index({ couponId: 1, customerId: 1 })
couponUsageSchema.index({ orderId: 1 }, { unique: true })

export const CouponUsage = mongoose.model<ICouponUsage>('CouponUsage', couponUsageSchema, 'couponusages')
