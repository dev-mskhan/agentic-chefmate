import mongoose, { Schema, Document } from 'mongoose'

export const DiscountTypeValues = ['PERCENTAGE', 'FIXED_AMOUNT'] as const
export type DiscountType = typeof DiscountTypeValues[number]

export interface ICoupon extends Document {
  code:               string         // normalised uppercase
  discountType:       DiscountType
  discountValue:      number         // percentage (0–100) or fixed amount
  minOrderAmount:     number         // minimum subtotal required
  maxDiscountAmount?: number         // cap on percentage discounts
  startDate:          Date
  expiryDate:         Date
  usageLimit?:        number         // global cap; undefined = unlimited
  perCustomerLimit?:  number         // per-user cap; undefined = unlimited
  isActive:           boolean
  totalUsed:          number         // incremented atomically on commit
  chefId?:            string         // scoped to one chef; undefined = platform-wide
  createdAt:          Date
  updatedAt:          Date
}

const couponSchema = new Schema<ICoupon>(
  {
    code:               { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType:       { type: String, enum: DiscountTypeValues, required: true },
    discountValue:      { type: Number, required: true, min: 0 },
    minOrderAmount:     { type: Number, required: true, min: 0, default: 0 },
    maxDiscountAmount:  { type: Number, min: 0 },
    startDate:          { type: Date, required: true },
    expiryDate:         { type: Date, required: true },
    usageLimit:         { type: Number, min: 1 },
    perCustomerLimit:   { type: Number, min: 1 },
    isActive:           { type: Boolean, default: true },
    totalUsed:          { type: Number, default: 0, min: 0 },
    chefId:             { type: String },
  },
  { timestamps: true },
)

couponSchema.index({ code: 1 }, { unique: true })
couponSchema.index({ isActive: 1, expiryDate: 1 })
couponSchema.index({ chefId: 1, isActive: 1 })

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema, 'coupons')
