/**
 * Coupon validation service.
 *
 * `validateCoupon` performs ALL server-side coupon checks and returns the
 * trusted discount amount. It does NOT commit usage — that is the job of
 * `coupon-usage.service.ts`, called only after the order + payment are created.
 */

import { Coupon } from '../models/coupon.model'
import { CouponUsage } from '../models/coupon-usage.model'
import { ValidationError, NotFoundError } from '@chefmate/errors'

export interface CouponValidationResult {
  couponId:       string
  couponCode:     string
  discountAmount: number   // trusted server-computed value, same currency as subtotal
}

/**
 * Validates a coupon code and computes the discount amount.
 *
 * @param couponCode  - Raw code from the client (will be uppercased)
 * @param customerId  - The ordering customer's userId
 * @param subtotal    - Subtotal BEFORE any discount (from calculatePricing)
 * @param chefId      - The chef the order is placed with (for chef-scoped coupons)
 */
export async function validateCoupon(
  couponCode: string,
  customerId: string,
  subtotal:   number,
  chefId?:    string,
): Promise<CouponValidationResult> {
  const code = couponCode.trim().toUpperCase()

  const coupon = await Coupon.findOne({ code })
  if (!coupon) throw new NotFoundError(`Coupon "${code}" not found`)

  if (!coupon.isActive) {
    throw new ValidationError(`Coupon "${code}" is no longer active`)
  }

  const now = new Date()
  if (now < coupon.startDate) {
    throw new ValidationError(`Coupon "${code}" is not yet valid`)
  }
  if (now > coupon.expiryDate) {
    throw new ValidationError(`Coupon "${code}" has expired`)
  }

  // Chef-scoped check
  if (coupon.chefId && coupon.chefId !== chefId) {
    throw new ValidationError(`Coupon "${code}" is not valid for this chef`)
  }

  // Minimum order amount
  if (subtotal < coupon.minOrderAmount) {
    throw new ValidationError(
      `Coupon "${code}" requires a minimum order of ${coupon.minOrderAmount} ${'' /* currency shown in UI */}`,
    )
  }

  // Global usage limit
  if (coupon.usageLimit !== undefined && coupon.totalUsed >= coupon.usageLimit) {
    throw new ValidationError(`Coupon "${code}" has reached its usage limit`)
  }

  // Per-customer usage limit
  if (coupon.perCustomerLimit !== undefined) {
    const customerUses = await CouponUsage.countDocuments({ couponId: coupon._id.toString(), customerId })
    if (customerUses >= coupon.perCustomerLimit) {
      throw new ValidationError(`You have already used coupon "${code}" the maximum number of times`)
    }
  }

  // Calculate discount
  let discountAmount: number
  if (coupon.discountType === 'PERCENTAGE') {
    // percentage is stored as 0–100
    discountAmount = Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100
    if (coupon.maxDiscountAmount !== undefined) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
    }
  } else {
    // FIXED_AMOUNT — cap at subtotal so we never give a negative total
    discountAmount = Math.min(coupon.discountValue, subtotal)
  }

  discountAmount = Math.round(discountAmount * 100) / 100

  return {
    couponId:       coupon._id.toString(),
    couponCode:     coupon.code,
    discountAmount,
  }
}
