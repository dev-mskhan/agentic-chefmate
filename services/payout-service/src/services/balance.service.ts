import { EarningsLedger } from '../models/earnings-ledger.model'

export interface AvailableBalance {
  availableBalanceCents: number
  currency:              string
}

export async function getAvailableBalance(chefId: string): Promise<AvailableBalance> {
  const [credits, debits, holds] = await Promise.all([
    EarningsLedger.aggregate([
      { $match: { chefId, type: 'CREDIT', status: 'AVAILABLE' } },
      { $group: { _id: '$currency', total: { $sum: '$netAmountCents' } } },
    ]),
    EarningsLedger.aggregate([
      { $match: { chefId, type: 'DEBIT', status: 'AVAILABLE' } },
      { $group: { _id: '$currency', total: { $sum: '$netAmountCents' } } },
    ]),
    EarningsLedger.aggregate([
      { $match: { chefId, type: 'HOLD', status: 'PENDING' } },
      { $group: { _id: '$currency', total: { $sum: '$netAmountCents' } } },
    ]),
  ])

  const creditTotal = (credits[0] as { total: number } | undefined)?.total  ?? 0
  const debitTotal  = (debits[0]  as { total: number } | undefined)?.total  ?? 0
  const holdTotal   = (holds[0]   as { total: number } | undefined)?.total  ?? 0
  const currency    = (credits[0] as { _id: string }  | undefined)?._id    ?? 'usd'

  return {
    availableBalanceCents: creditTotal - debitTotal - holdTotal,
    currency,
  }
}
