import { router } from './trpc'
import { getPaymentProcedure, getPaymentStatusProcedure } from './procedures/get-payment'
import { createRefundProcedure } from './procedures/create-refund'

export const appRouter = router({
  getPayment:       getPaymentProcedure,
  getPaymentStatus: getPaymentStatusProcedure,
  createRefund:     createRefundProcedure,
})

export type AppRouter = typeof appRouter
