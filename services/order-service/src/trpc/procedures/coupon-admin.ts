import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { Coupon, DiscountTypeValues } from '../../models/coupon.model'
import { NotFoundError } from '@chefmate/errors'

const couponInput = z.object({
  code:              z.string().min(1).max(50),
  discountType:      z.enum(DiscountTypeValues),
  discountValue:     z.number().min(0),
  minOrderAmount:    z.number().min(0).default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  startDate:         z.string().datetime(),
  expiryDate:        z.string().datetime(),
  usageLimit:        z.number().int().min(1).optional(),
  perCustomerLimit:  z.number().int().min(1).optional(),
  chefId:            z.string().optional(),
})

export const createCouponProcedure = adminProcedure
  .input(couponInput)
  .mutation(async ({ input }) => {
    const coupon = await Coupon.create({
      ...input,
      code:      input.code.trim().toUpperCase(),
      isActive:  true,
      totalUsed: 0,
      startDate: new Date(input.startDate),
      expiryDate: new Date(input.expiryDate),
    })
    return coupon.toObject()
  })

export const updateCouponProcedure = adminProcedure
  .input(couponInput.partial().extend({ couponId: z.string() }))
  .mutation(async ({ input }) => {
    const { couponId, ...updates } = input
    const updated = await Coupon.findByIdAndUpdate(couponId, { $set: updates }, { new: true })
    if (!updated) throw new NotFoundError('Coupon not found')
    return updated.toObject()
  })

export const deactivateCouponProcedure = adminProcedure
  .input(z.object({ couponId: z.string() }))
  .mutation(async ({ input }) => {
    const updated = await Coupon.findByIdAndUpdate(
      input.couponId, { $set: { isActive: false } }, { new: true },
    )
    if (!updated) throw new NotFoundError('Coupon not found')
    return { couponId: updated._id.toString(), isActive: false }
  })

export const listCouponsProcedure = adminProcedure
  .input(z.object({
    isActive: z.boolean().optional(),
    limit:    z.number().int().min(1).max(100).default(20),
    offset:   z.number().int().min(0).default(0),
  }))
  .query(async ({ input }) => {
    const filter: Record<string, unknown> = {}
    if (input.isActive !== undefined) filter['isActive'] = input.isActive
    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip(input.offset).limit(input.limit).lean(),
      Coupon.countDocuments(filter),
    ])
    return { coupons, total }
  })

export const getCouponProcedure = adminProcedure
  .input(z.object({ couponId: z.string() }))
  .query(async ({ input }) => {
    const coupon = await Coupon.findById(input.couponId).lean()
    if (!coupon) throw new NotFoundError('Coupon not found')
    return coupon
  })
