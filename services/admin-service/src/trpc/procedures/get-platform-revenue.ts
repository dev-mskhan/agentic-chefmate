import { z } from 'zod'
import { adminProcedure }        from '../trpc'
import { AdminEarningsLedger }   from '../../models/earnings-ledger.model'
import { AdminOrder }            from '../../models/order.model'

export const getPlatformRevenueProcedure = adminProcedure
  .input(z.object({ from: z.string().datetime(), to: z.string().datetime() }))
  .query(async ({ input: i }) => {
    const from = new Date(i.from)
    const to   = new Date(i.to)
    const dr   = { createdAt: { $gte: from, $lte: to } }
    const div  = (field: string) => ({ $sum: { $divide: [field, 100] } })

    const [creditsR, debitsR, gmvR] = await Promise.all([
      AdminEarningsLedger.aggregate([
        { $match: { ...dr, type: 'CREDIT' } },
        { $group: { _id: null, gross: div('$grossAmountCents'), fees: div('$platformFeeCents'), net: div('$netAmountCents'), currency: { $first: '$currency' } } },
      ]),
      AdminEarningsLedger.aggregate([
        { $match: { ...dr, type: 'DEBIT' } },
        { $group: { _id: null, total: div('$netAmountCents') } },
      ]),
      AdminOrder.aggregate([
        { $match: { ...dr, status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] } } },
        { $group: { _id: null, gmv: { $sum: '$pricing.total' } } },
      ]),
    ])
    const c = (creditsR[0] as any) ?? {}
    return {
      gmv:           (gmvR[0] as any)?.gmv    ?? 0,
      grossEarnings: c.gross   ?? 0,
      platformFees:  c.fees    ?? 0,
      netEarnings:   c.net     ?? 0,
      refunds:       (debitsR[0] as any)?.total ?? 0,
      currency:      c.currency ?? 'USD',
      from: i.from,
      to:   i.to,
    }
  })
