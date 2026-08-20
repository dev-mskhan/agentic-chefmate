import { userProcedure } from '../trpc'
import { DashNotification } from '../../models/notification.model'

export const getMyNotificationSummaryProcedure = userProcedure.query(async ({ ctx }) => {
  const userId = ctx.principal.userId

  const [unreadCount, notifications] = await Promise.all([
    DashNotification.countDocuments({ userId, readAt: null, status: 'delivered' }),
    DashNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id type title message readAt status createdAt')
      .lean(),
  ])

  return { unreadCount, notifications }
})
