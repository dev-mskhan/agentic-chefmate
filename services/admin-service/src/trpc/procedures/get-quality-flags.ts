import { adminProcedure }  from '../trpc'
import { AdminPayment }    from '../../models/payment.model'
import { AdminOrder }      from '../../models/order.model'
import { AdminReview }     from '../../models/review.model'

const REFUND_THRESHOLD   = 3
const CANCEL_THRESHOLD   = 5
const REJECTED_THRESHOLD = 3

export const getQualityFlagsProcedure = adminProcedure.query(async () => {
  const [highRefundChefs, highCancelUsers, highRejectedChefs] = await Promise.all([
    // Chefs with many refunded payments — join orders to find chefId
    AdminPayment.aggregate([
      { $match: { status: { $in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } } },
      { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: '_order' } },
      { $unwind: { path: '$_order', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$_order.chefId', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null }, count: { $gt: REFUND_THRESHOLD } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
    AdminOrder.aggregate([
      { $match: { status: 'CANCELLED' } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
      { $match: { count: { $gt: CANCEL_THRESHOLD } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
    AdminReview.aggregate([
      { $match: { status: 'REJECTED' } },
      { $group: { _id: '$chefId', count: { $sum: 1 } } },
      { $match: { count: { $gt: REJECTED_THRESHOLD } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
  ])

  return {
    flags: [
      ...(highRefundChefs  as any[]).map(r => ({ entityType: 'chef',  entityId: r._id, flagType: 'HIGH_REFUND_RATE',            count: r.count, threshold: REFUND_THRESHOLD   })),
      ...(highCancelUsers  as any[]).map(r => ({ entityType: 'user',  entityId: r._id, flagType: 'HIGH_CANCELLATION_RATE',       count: r.count, threshold: CANCEL_THRESHOLD   })),
      ...(highRejectedChefs as any[]).map(r => ({ entityType: 'chef', entityId: r._id, flagType: 'HIGH_REJECTED_REVIEW_RATE',    count: r.count, threshold: REJECTED_THRESHOLD })),
    ],
  }
})
