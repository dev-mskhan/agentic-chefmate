import { useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Wallet,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getChefEarnings,
  requestPayout,
  type ChefLedgerItem,
} from '../../services/api/chefService'

export function ChefEarningsPage() {
  const [earnings, setEarnings] = useState<{
    availableBalance: number
    pendingEarnings: number
    heldFunds: number
    grossEarnings: number
    ledger: ChefLedgerItem[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  useEffect(() => {
    getChefEarnings()
      .then((data) => {
        setEarnings(data)
        setPayoutAmount(String(data.availableBalance))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!earnings || !payoutAmount) return
    const amt = Number(payoutAmount)
    if (amt <= 0 || amt > earnings.availableBalance) return

    setRequesting(true)
    await requestPayout(amt)
    const refreshed = await getChefEarnings()
    setEarnings(refreshed)
    setRequesting(false)
    setShowPayoutModal(false)
    setPayoutSuccess(true)
    setTimeout(() => setPayoutSuccess(false), 4000)
  }

  if (loading || !earnings) {
    return (
      <ChefShell title="Earnings & Payouts">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </ChefShell>
    )
  }

  return (
    <ChefShell
      title="Earnings & Payouts"
      subtitle="Direct bank transfers, order disbursements, and transparent ledger history."
      actions={
        earnings.availableBalance > 0 ? (
          <Button onClick={() => setShowPayoutModal(true)} className="text-xs py-2 px-4 gap-1.5">
            <Wallet size={14} /> Request Bank Payout
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-8">
        {payoutSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-sage/15 p-4 text-xs font-bold text-sage border border-sage/20">
            <Check size={16} /> Payout request submitted! Funds will arrive in your registered bank account within 1-2 business days.
          </div>
        )}

        {/* Balance cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-2">
            <span className="text-xs font-semibold text-charcoal-70">Available for Payout</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-charcoal-70">PKR</span>
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {earnings.availableBalance.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-sage font-medium">Cleared for bank transfer</p>
          </div>

          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-2">
            <span className="text-xs font-semibold text-charcoal-70">Pending Settlement</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-charcoal-70">PKR</span>
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {earnings.pendingEarnings.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-charcoal-70">From active delivered orders</p>
          </div>

          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-2">
            <span className="text-xs font-semibold text-charcoal-70">Held Funds</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-charcoal-70">PKR</span>
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {earnings.heldFunds.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-charcoal-70">Zero active dispute holds</p>
          </div>

          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-2">
            <span className="text-xs font-semibold text-charcoal-70">Lifetime Gross</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-charcoal-70">PKR</span>
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {earnings.grossEarnings.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-sage font-medium">Platform verified sales</p>
          </div>
        </div>

        {/* Ledger History Table */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <div>
            <h2 className="font-display text-xl text-charcoal">Transaction Ledger</h2>
            <p className="text-xs text-charcoal-70">
              Audit trail of every order credit, payout debit, and hold release.
            </p>
          </div>

          <div className="divide-y divide-charcoal/10 overflow-x-auto">
            {earnings.ledger.map((item) => {
              const isCredit = item.type === 'CREDIT' || item.type === 'HOLD_RELEASE'

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-2 last:pb-2 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isCredit ? 'bg-sage/15 text-sage' : 'bg-terracotta/15 text-terracotta'
                      }`}
                    >
                      {isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <strong className="text-charcoal block font-semibold">
                        {item.description}
                      </strong>
                      <span className="text-[11px] text-charcoal-70 font-mono">
                        {item.id} · {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-display text-base font-bold tabular-nums block ${
                        isCredit ? 'text-sage' : 'text-charcoal'
                      }`}
                    >
                      {isCredit ? '+' : '-'} {item.currency} {item.amount.toLocaleString()}
                    </span>
                    <Badge tone={item.status === 'COMPLETED' || item.status === 'SETTLED' ? 'success' : 'neutral'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payout Modal */}
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-cream p-6 sm:p-8 border border-charcoal/10 shadow-2xl space-y-4">
              <h3 className="font-display text-2xl text-charcoal">Request Bank Payout</h3>
              <p className="text-xs text-charcoal-70 leading-5">
                Funds will be transferred directly to your verified Habib Bank Limited (HBL) account ending in <strong>4081</strong>.
              </p>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">
                    Payout Amount (PKR)
                  </label>
                  <Input
                    type="number"
                    max={earnings.availableBalance}
                    min="1000"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-charcoal-70 block">
                    Available: PKR {earnings.availableBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="rounded-pill px-4 py-2 text-xs font-semibold text-charcoal-70 hover:bg-cream-dim"
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={requesting} className="text-xs py-2 px-5">
                    {requesting ? 'Processing...' : 'Confirm Transfer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ChefShell>
  )
}
