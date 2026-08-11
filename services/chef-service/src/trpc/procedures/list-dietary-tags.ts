import { publicProcedure } from '../trpc'
import { DietaryTagValues, DIETARY_LABELS } from '../../constants'

export const listDietaryTagsProcedure = publicProcedure
  .query(() => ({
    values: DietaryTagValues,
    labels: DIETARY_LABELS,
  }))
