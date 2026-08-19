import { chefProcedure } from '../trpc'
import { createOnboardingLink } from '../../services/connect.service'

export const createOnboardingLinkProcedure = chefProcedure.mutation(async ({ ctx }) => {
  const url = await createOnboardingLink(
    ctx.principal.userId,
    ctx.config.STRIPE_CONNECT_RETURN_URL,
    ctx.config.STRIPE_CONNECT_REFRESH_URL,
  )
  return { url }
})
