import { chefProcedure } from '../trpc'
import { createOnboardingLink } from '../../services/connect.service'
import { resolveChefId } from '../../services/chef-client.service'

export const createOnboardingLinkProcedure = chefProcedure.mutation(async ({ ctx }) => {
  const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
  const url = await createOnboardingLink(
    chefId,
    ctx.config.STRIPE_CONNECT_RETURN_URL,
    ctx.config.STRIPE_CONNECT_REFRESH_URL,
  )
  return { url }
})
