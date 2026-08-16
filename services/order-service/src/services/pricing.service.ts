/**
 * Pricing service for Order Service.
 *
 * Single source of truth for all order price calculations.
 * All pricing is determined server-side — client-supplied values are never trusted.
 *
 * Phase 1: subtotal + deliveryFee (deliveryFee = 0 for now).
 * Phase 2: adds optional coupon discount. total = subtotal + deliveryFee - discountAmount (≥ 0).
 *
 * Uses integer rounding (× 100) throughout to avoid floating-point drift.
 */

export interface PricingInput {
  items: Array<{
    quantity:  number
    unitPrice: number
    currency:  string
  }>
  discount?: {
    amount:     number   // server-computed discount amount (same currency as items)
    couponCode: string
  }
}

export interface PricingResult {
  subtotal:       number
  deliveryFee:    number
  discountAmount: number
  total:          number
  currency:       string
  couponCode?:    string
}

/**
 * Calculates order totals from validated dish snapshots and an optional discount.
 * Rounds every intermediate value to 2 decimal places.
 */
export function calculatePricing(input: PricingInput): PricingResult {
  if (input.items.length === 0) {
    throw new Error('Cannot price an order with no items')
  }

  const currency = input.items[0]!.currency

  // subtotal = Σ (quantity × unitPrice), rounded to 2dp
  let subtotal = 0
  for (const item of input.items) {
    subtotal += item.quantity * item.unitPrice
  }
  subtotal = Math.round(subtotal * 100) / 100

  const deliveryFee = 0  // Phase 3+ will introduce real delivery fee logic

  const discountAmount = input.discount
    ? Math.round(input.discount.amount * 100) / 100
    : 0

  // total must never go below 0
  const total = Math.round(Math.max(0, subtotal + deliveryFee - discountAmount) * 100) / 100

  return {
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    currency,
    couponCode: input.discount?.couponCode,
  }
}
