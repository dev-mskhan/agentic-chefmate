import { router } from './trpc'

import { createOrderProcedure }       from './procedures/create-order'
import { getMyOrderProcedure }        from './procedures/get-my-order'
import { listMyOrdersProcedure }      from './procedures/list-my-orders'
import { getChefOrderProcedure }      from './procedures/get-chef-order'
import { listChefOrdersProcedure }    from './procedures/list-chef-orders'
import { updateOrderStatusProcedure } from './procedures/update-order-status'
import { cancelOrderProcedure }       from './procedures/cancel-order'
import { checkoutProcedure }          from './procedures/checkout'
import { checkoutPreviewProcedure }   from './procedures/checkout-preview'
import { validateCouponProcedure }    from './procedures/validate-coupon'
import {
  createCouponProcedure,
  updateCouponProcedure,
  deactivateCouponProcedure,
  listCouponsProcedure,
  getCouponProcedure,
} from './procedures/coupon-admin'

export const appRouter = router({
  // ── Customer order procedures ────────────────────────────────────────────────
  createOrder:  createOrderProcedure,
  getMyOrder:   getMyOrderProcedure,
  listMyOrders: listMyOrdersProcedure,
  cancelOrder:  cancelOrderProcedure,

  // ── Checkout procedures ──────────────────────────────────────────────────────
  checkout:        checkoutProcedure,
  checkoutPreview: checkoutPreviewProcedure,
  validateCoupon:  validateCouponProcedure,

  // ── Admin coupon procedures ──────────────────────────────────────────────────
  createCoupon:     createCouponProcedure,
  updateCoupon:     updateCouponProcedure,
  deactivateCoupon: deactivateCouponProcedure,
  listCoupons:      listCouponsProcedure,
  getCoupon:        getCouponProcedure,

  // ── Chef procedures ──────────────────────────────────────────────────────────
  getChefOrder:      getChefOrderProcedure,
  listChefOrders:    listChefOrdersProcedure,
  updateOrderStatus: updateOrderStatusProcedure,
})

export type AppRouter = typeof appRouter
