import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { adminProcedure } from '../trpc'
import { ChefProfile, ChefVerificationStatusValues, ChefAccountStateValues } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

const updateChefStatusInput = z.object({
  chefId:             z.string(),
  verificationStatus: z.enum(ChefVerificationStatusValues).optional(),
  accountState:       z.enum(ChefAccountStateValues).optional(),
  reason:             z.string().optional(),
})

/**
 * Calls the auth-service internal changeRole endpoint to promote a user to CHEF.
 * This is a service-to-service call using the internal tRPC route, authenticated
 * with the shared x-internal-secret header.
 */
async function promoteUserToChef(
  authServiceUrl: string,
  userId: string,
  internalSecret: string,
): Promise<void> {
  const url = `${authServiceUrl}/api/v1/auth/trpc/changeRole`
  const body = JSON.stringify({ userId, newRole: 'CHEF' })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': internalSecret,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to promote user ${userId} to CHEF: ${res.status} ${text}`)
  }
}

export const updateChefStatusProcedure = adminProcedure
  .input(updateChefStatusInput)
  .mutation(async ({ ctx, input }) => {
    const { chefId, reason } = input

    // Fetch by chefId
    const profile = await ChefProfile.findById(chefId)
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    // Capture old status before update
    const oldVerificationStatus = profile.verificationStatus
    const oldAccountState       = profile.accountState

    // Build update fields
    const updateFields: Record<string, unknown> = {}
    if (input.verificationStatus !== undefined) updateFields['verificationStatus'] = input.verificationStatus
    if (input.accountState       !== undefined) updateFields['accountState']       = input.accountState

    const updated = await ChefProfile.findByIdAndUpdate(
      chefId,
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Chef profile not found')
    }

    // Invalidate cache
    await ctx.cache.invalidateProfile(chefId)

    // ── Role promotion ────────────────────────────────────────────────────────
    // When admin fully approves (verificationStatus → ACTIVE AND accountState → ACTIVE),
    // promote the user's role in auth-service from USER → CHEF.
    // Note: both fields must be set to ACTIVE in the same call to trigger promotion.
    const isApproval =
      input.verificationStatus === 'ACTIVE' &&
      updated.verificationStatus === 'ACTIVE' &&
      input.accountState === 'ACTIVE' &&
      updated.accountState === 'ACTIVE'

    if (isApproval) {
      const authServiceUrl = ctx.config.AUTH_SERVICE_URL ?? 'http://localhost:3001'
      await promoteUserToChef(authServiceUrl, profile.userId, ctx.config.INTERNAL_SECRET!)
    }

    // Build a combined status string for the event
    const oldStatus = input.verificationStatus !== undefined
      ? oldVerificationStatus
      : oldAccountState
    const newStatus = input.verificationStatus !== undefined
      ? updated.verificationStatus
      : updated.accountState

    // Publish event
    await publishChefEvent({
      type:      'chef.status_changed',
      chefId,
      oldStatus,
      newStatus,
      changedBy: ctx.principal.userId,
      reason,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return {
      chefId:             updated._id.toString(),
      verificationStatus: updated.verificationStatus,
      accountState:       updated.accountState,
    }
  })
