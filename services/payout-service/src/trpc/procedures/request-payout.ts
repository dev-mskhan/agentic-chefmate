import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import { chefProcedure } from '../trpc'
import { ConnectAccount } from '../../models/connect-account.model'
import { Payout } from '../../models/payout.model'
import { getAvailableBalance } from '../../services/balance.service'
import { publishPayoutEvent }  from '../../services/event.service'
import { ForbiddenError, ValidationError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'
import { config } from '../../config'

const logger = createLogger('payout-service:request-payout')

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  return _stripe
}

export const requestPayoutProcedure = chefProcedure
  .input(z.object({
    amountCents: z.number().int().min(1),
    currency:    z.string().min(3).max(3),
  }))
  .mutation(async ({ ctx, input }) => {
    const chefId = ctx.principal.userId

    // 1. Verify ACTIVE Connect account
    const account = await ConnectAccount.findOne({ chefId })
    if (!account || account.status !== 'ACTIVE') {
      throw new TRPCError({
        code:    'FORBIDDEN',
        message: 'Connect account is not active',
        cause:   new ForbiddenError('Connect account is not active'),
      })
    }

    // 2. Check available balance
    const { availableBalanceCents } = await getAvailableBalance(chefId)
    if (input.amountCents > availableBalanceCents) {
      throw new TRPCError({
        code:    'BAD_REQUEST',
        message: 'Insufficient available balance',
        cause:   new ValidationError('Insufficient available balance'),
      })
    }

    // 3. Create Payout record
    const payout = await Payout.create({
      chefId,
      stripeAccountId: account.stripeAccountId,
      amountCents:     input.amountCents,
      currency:        input.currency.toLowerCase(),
      status:          'PENDING',
    })
    const payoutId = (payout._id as { toString(): string }).toString()

    // 4. Execute Stripe Transfer
    try {
      const transfer = await getStripe().transfers.create(
        {
          amount:      input.amountCents,
          currency:    input.currency.toLowerCase(),
          destination: account.stripeAccountId,
          metadata:    { chefId, payoutId },
        },
        { idempotencyKey: `transfer_${payoutId}` },
      )

      payout.status          = 'PROCESSING'
      payout.stripeTransferId = transfer.id
      await payout.save()

      await publishPayoutEvent({
        type:             'payout.transfer_created',
        chefId,
        payoutId,
        stripeTransferId: transfer.id,
        amountCents:      input.amountCents,
        currency:         input.currency.toLowerCase(),
        createdAt:        new Date().toISOString(),
        version:          '1',
      })

      logger.info({ chefId, payoutId, stripeTransferId: transfer.id }, 'Stripe transfer created')
      return { payoutId, status: payout.status, stripeTransferId: transfer.id }

    } catch (err: unknown) {
      const reason = (err as Error).message ?? 'Transfer failed'
      payout.status        = 'FAILED'
      payout.failureReason = reason
      await payout.save()

      await publishPayoutEvent({
        type:      'payout.failed',
        chefId,
        payoutId,
        reason,
        createdAt: new Date().toISOString(),
        version:   '1',
      })

      logger.error({ err, chefId, payoutId }, 'Stripe transfer failed')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Transfer failed: ${reason}` })
    }
  })
