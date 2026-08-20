import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { EarningsLedger } from '../../models/earnings-ledger.model'
import { Payout } from '../../models/payout.model'

interface StatementRow {
  date: string
  type: string
  description: string
  grossAmountCents: number
  platformFeeCents: number
  netAmountCents: number
  currency: string
  status: string
}

function buildCsv(rows: StatementRow[]): string {
  const header = 'date,type,description,grossAmountCents,platformFeeCents,netAmountCents,currency,status'
  const lines = rows.map(
    (r) =>
      `${r.date},${r.type},${r.description},${r.grossAmountCents},${r.platformFeeCents},${r.netAmountCents},${r.currency},${r.status}`,
  )
  return [header, ...lines].join('\n')
}

export const getStatementProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [ledgerEntries, payoutEntries] = await Promise.all([
      EarningsLedger.find({ chefId, createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: 1 })
        .lean(),
      Payout.find({ chefId, createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: 1 })
        .lean(),
    ])

    const rows: StatementRow[] = [
      ...(ledgerEntries as any[]).map((entry) => ({
        date: new Date(entry.createdAt).toISOString(),
        type: entry.type as string,
        description: `Earnings ${entry.type}`,
        grossAmountCents: entry.grossAmountCents as number,
        platformFeeCents: entry.platformFeeCents as number,
        netAmountCents: entry.netAmountCents as number,
        currency: entry.currency as string,
        status: entry.status as string,
      })),
      ...(payoutEntries as any[]).map((payout) => ({
        date: new Date(payout.createdAt).toISOString(),
        type: 'PAYOUT',
        description: `Payout ${payout.status}`,
        grossAmountCents: payout.amountCents as number,
        platformFeeCents: 0,
        netAmountCents: payout.amountCents as number,
        currency: payout.currency as string,
        status: payout.status as string,
      })),
    ]

    // Sort combined rows by date
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const csv = buildCsv(rows)
    const filename = `statement-${chefId}-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`

    return { csv, filename }
  })
