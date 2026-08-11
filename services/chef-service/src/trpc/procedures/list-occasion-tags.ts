import { publicProcedure } from '../trpc'
import { OccasionTagValues, OCCASION_LABELS } from '../../constants'

export const listOccasionTagsProcedure = publicProcedure
  .query(() => ({
    values: OccasionTagValues,
    labels: OCCASION_LABELS,
  }))
