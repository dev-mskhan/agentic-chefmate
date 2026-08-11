import { publicProcedure } from '../trpc'
import { AllergenValues, ALLERGEN_LABELS } from '../../constants'

export const listAllergensProcedure = publicProcedure
  .query(() => ({
    values: AllergenValues,
    labels: ALLERGEN_LABELS,
  }))
