import { publicProcedure } from '../trpc'
import { CuisineCategoryValues, CUISINE_LABELS } from '../../constants'

export const listCuisineCategoriesProcedure = publicProcedure
  .query(() => ({
    values: CuisineCategoryValues,
    labels: CUISINE_LABELS,
  }))
