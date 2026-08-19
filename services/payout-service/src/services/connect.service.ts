import Stripe from 'stripe'
import { config } from '../config'
import { ConnectAccount, ConnectAccountStatus, IConnectAccount } from '../models/connect-account.model'
import { ConflictError, NotFoundError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('payout-service:connect')

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  return _stripe
}

/**
 * Pure helper — derives a simple internal status from Stripe account capabilities.
 */
export function deriveConnectStatus(
  chargesEnabled:   boolean,
  payoutsEnabled:   boolean,
  detailsSubmitted: boolean,
): ConnectAccountStatus {
  if (chargesEnabled && payoutsEnabled) return 'ACTIVE'
  if (detailsSubmitted)                 return 'RESTRICTED'
  return 'ONBOARDING'
}

export async function createConnectAccount(chefId: string): Promise<IConnectAccount> {
  const existing = await ConnectAccount.findOne({ chefId })
  if (existing) throw new ConflictError('Connect account already exists for this chef')

  const account = await getStripe().accounts.create({
    type:     'express',
    metadata: { chefId },
  })

  const doc = await ConnectAccount.create({
    chefId,
    stripeAccountId:  account.id,
    status:           'PENDING',
    chargesEnabled:   false,
    payoutsEnabled:   false,
    detailsSubmitted: false,
    requirements:     {},
  })
  logger.info({ chefId, stripeAccountId: account.id }, 'Connect account created')
  return doc
}

export async function createOnboardingLink(
  chefId:     string,
  returnUrl:  string,
  refreshUrl: string,
): Promise<string> {
  const account = await ConnectAccount.findOne({ chefId })
  if (!account) throw new NotFoundError('No Connect account found for this chef')

  const link = await getStripe().accountLinks.create({
    account:     account.stripeAccountId,
    refresh_url: refreshUrl,
    return_url:  returnUrl,
    type:        'account_onboarding',
  })
  return link.url
}

export async function getConnectAccountStatus(chefId: string): Promise<{
  status:           ConnectAccountStatus
  chargesEnabled:   boolean
  payoutsEnabled:   boolean
  detailsSubmitted: boolean
  requirements:     Record<string, unknown>
}> {
  const account = await ConnectAccount.findOne({ chefId })
  if (!account) throw new NotFoundError('No Connect account found for this chef')
  return {
    status:           account.status,
    chargesEnabled:   account.chargesEnabled,
    payoutsEnabled:   account.payoutsEnabled,
    detailsSubmitted: account.detailsSubmitted,
    requirements:     account.requirements,
  }
}

export async function handleAccountUpdated(stripeAccount: Stripe.Account): Promise<void> {
  const account = await ConnectAccount.findOne({ stripeAccountId: stripeAccount.id })
  if (!account) {
    logger.warn({ stripeAccountId: stripeAccount.id }, 'account.updated for unknown Connect account — skipping')
    return
  }

  account.chargesEnabled   = stripeAccount.charges_enabled
  account.payoutsEnabled   = stripeAccount.payouts_enabled
  account.detailsSubmitted = stripeAccount.details_submitted
  account.requirements     = stripeAccount.requirements as unknown as Record<string, unknown> ?? {}
  account.status           = deriveConnectStatus(
    stripeAccount.charges_enabled,
    stripeAccount.payouts_enabled,
    stripeAccount.details_submitted,
  )
  await account.save()
  logger.info({ chefId: account.chefId, status: account.status }, 'Connect account updated')
}
