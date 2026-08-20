import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Review } from '../../models/review.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getRatingMetricsProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [chefProfile, distributionRaw, recentReviews] = await Promise.all([
      // 1. All-time averageRating / totalReviews from chef profile
      ChefProfile.findOne({ userId: chefId }).select('averageRating totalReviews').lean(),

      // 2. Distribution of PUBLISHED reviews in date range
      Review.aggregate([
        { $match: { chefId, status: 'PUBLISHED', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),

      // 3. 5 most recent PUBLISHED reviews in date range
      Review.find({ chefId, status: 'PUBLISHED', createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    // Build distribution map (defaults 1-5 to 0)
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const entry of distributionRaw) {
      const star = entry._id as 1 | 2 | 3 | 4 | 5
      if (star >= 1 && star <= 5) {
        distribution[star] = entry.count as number
      }
    }

    return {
      averageRating: (chefProfile as any)?.averageRating ?? 0,
      totalReviews: (chefProfile as any)?.totalReviews ?? 0,
      distribution,
      recentReviews: (recentReviews as any[]).map((r) => ({
        _id: r._id.toString(),
        rating: r.rating as number,
        text: r.text as string | undefined,
        customerId: r.customerId as string,
        createdAt: r.createdAt as Date,
      })),
    }
  })
