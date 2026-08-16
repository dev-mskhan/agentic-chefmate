import { Coupon } from '../models/coupon.model'
import { CouponUsage } from '../models/coupon-usage.model'
import { ConflictError } from '@chefmate/errors'

export async function commitCouponUsage(
  couponId: string,
  customerId: string,
  orderId: string,
): Promise<void> {
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      isActive: true,
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$totalUsed', '$usageLimit'] } },
      ],
    },
    { $inc: { totalUsed: 1 } },
    { new: true },
  )
  if (!updated) {
    throw new ConflictError('Coupon usage limit reached')
  }
  await CouponUsage.create({ couponId, customerId, orderId, usedAt: new Date() })
}

export async function rollbackCouponUsage(
  couponId: string,
  customerId: string,
  orderId: string,
): Promise<void> {
  const usage = await CouponUsage.findOneAndDelete({ couponId, customerId, orderId })
  if (usage) {
    await Coupon.findByIdAndUpdate(couponId, { $inc: { totalUsed: -1 } })
  }
}
