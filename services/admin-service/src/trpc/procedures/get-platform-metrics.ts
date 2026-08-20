import { z } from 'zod'
import { adminProcedure }    from '../trpc'
import { AdminUser }         from '../../models/user.model'
import { AdminChefProfile }  from '../../models/chef-profile.model'
import { AdminOrder }        from '../../models/order.model'
import { AdminSubscription } from '../../models/subscription.model'

const input = z.object({ from: z.string().datetime(), to: z.string().datetime() })

export const getPlatformMetricsProcedure = adminProcedure
  .input(input)
  .query(async ({ input: i }) => {
    const from = new Date(i.from)
    const to   = new Date(i.to)
    const dr   = { createdAt: { $gte: from, $lte: to } }

    const [newUsers, newChefs, approvedChefs, newOrders, completedOrders, cancelledOrders, newSubs] = await Promise.all([
      AdminUser.countDocuments(dr),
      AdminChefProfile.countDocuments(dr),
      AdminChefProfile.countDocuments({ ...dr, verificationStatus: 'ACTIVE' }),
      AdminOrder.countDocuments(dr),
      AdminOrder.countDocuments({ ...dr, status: 'DELIVERED' }),
      AdminOrder.countDocuments({ ...dr, status: 'CANCELLED' }),
      AdminSubscription.countDocuments(dr),
    ])
    return { newUsers, newChefs, approvedChefs, newOrders, completedOrders, cancelledOrders, newSubs, from: i.from, to: i.to }
  })
