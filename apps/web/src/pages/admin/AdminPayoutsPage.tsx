import { useEffect, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Download,
  Search,
  X,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAdminPayouts,
  settlePayout,
  type AdminPayoutRecord,
} from '../../services/api/adminService'

export function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayoutRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadData = () => {
    getAdminPayouts().then((res) => {
      setPayouts(res)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSettle = async (payoutId: string) => {
    await settlePayout(payoutId)
    setActionSuccess(`Disbursement #${payoutId} settled via 1-Link Banking API.`)
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const totalPendingAmount = payouts
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalSettledAmount = payouts
    .filter((p) => p.status === 'SETTLED')
    .reduce((sum, p) => sum + p.amount, 0)

  const filteredPayouts = payouts.filter(
    (p) =>
      p.chefName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kitchenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.bankName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <AdminShell
      eyebrow="Financial Operations"
      title="Chef Disbursements & Ledger Settlements"
      actions={
        <button
          onClick={() => alert('Exporting NACHA / 1-Link bulk payout file...')}
          className="rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Download size={14} /> Export 1-Link Batch
        </button>
      }
    >
      <div className="space-y-6">
        {actionSuccess && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-400 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Payout Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-1">
            <span className="text-zinc-400 text-xs font-semibold">Pending Batch Volume</span>
            <p className="font-display text-2xl font-bold text-amber-400 tabular-nums">
              PKR {totalPendingAmount.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500">Awaiting bank settlement confirmation</p>
          </div>

          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-1">
            <span className="text-zinc-400 text-xs font-semibold">Settled Disbursements</span>
            <p className="font-display text-2xl font-bold text-emerald-400 tabular-nums">
              PKR {totalSettledAmount.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500">Transferred directly to verified IBANs</p>
          </div>

          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-1">
            <span className="text-zinc-400 text-xs font-semibold">Settlement Schedule</span>
            <p className="font-display text-2xl font-bold text-white">Every Friday</p>
            <p className="text-[11px] text-zinc-500">Weekly automated cutoff at 23:59 PKT</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Payout Requests ({filteredPayouts.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Review kitchen earnings ledgers and release verified earnings.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search by chef, kitchen or bank…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-pill bg-zinc-900 border border-zinc-800 pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-terracotta w-72"
            />
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#141417]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-bold">Disbursement ID</th>
                <th className="py-3.5 px-4 font-bold">Kitchen & Chef</th>
                <th className="py-3.5 px-4 font-bold">Bank & Account (IBAN)</th>
                <th className="py-3.5 px-4 font-bold">Billing Cycle</th>
                <th className="py-3.5 px-4 font-bold">Net Payout</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredPayouts.map((payout) => {
                const isSettled = payout.status === 'SETTLED'
                return (
                  <tr key={payout.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      #{payout.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-zinc-100">{payout.kitchenName}</p>
                      <p className="text-[11px] text-zinc-500">{payout.chefName}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      <p className="font-semibold text-zinc-200">{payout.bankName}</p>
                      <p className="font-mono text-zinc-500">{payout.accountNumber}</p>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">{payout.period}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm tabular-nums">
                      PKR {payout.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSettled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <Check size={12} className="text-emerald-400" /> Settled
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSettle(payout.id)}
                          className="rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition-colors shadow-sm"
                        >
                          Authorize Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
