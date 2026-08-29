import { useEffect, useState } from 'react'
import {
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getQualityFlags,
  type QualityFlagItem,
} from '../../services/api/adminService'

export function AdminQualityPage() {
  const [flags, setFlags] = useState<QualityFlagItem[]>([])
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  useEffect(() => {
    getQualityFlags().then((res) => {
      setFlags(res)
    })
  }, [])

  const handleResolve = (flagId: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== flagId))
    setActionNotice('Quality investigation resolved and archived.')
    setTimeout(() => setActionNotice(null), 4000)
  }

  return (
    <AdminShell
      eyebrow="Marketplace Integrity"
      title="Automated Quality & Risk Monitoring"
      actions={
        <span className="rounded-pill bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          Threshold Evaluation: <strong className="text-emerald-400">Every 15 min</strong>
        </span>
      }
    >
      <div className="space-y-6">
        {actionNotice && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> {actionNotice}
            </span>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-2 text-xs text-zinc-300">
          <p className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-terracotta" size={16} /> Quality Threshold Policy
          </p>
          <p className="text-zinc-400 leading-relaxed max-w-3xl">
            The platform algorithm continuously flags kitchens and customer accounts exceeding baseline cancellation, refund, or negative review thresholds (e.g. &gt; 3 refunded orders or &gt; 5 customer cancellations) to prevent marketplace fraud and maintain high culinary standards.
          </p>
        </div>

        {/* Quality Flags Cards */}
        <div className="grid gap-4">
          {flags.map((flag) => {
            const isCritical = flag.severity === 'CRITICAL'
            const isHigh = flag.severity === 'HIGH'

            return (
              <div
                key={flag.id}
                className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      <AlertOctagon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-base font-bold text-white">
                          {flag.entityName}
                        </h4>
                        <span className="text-xs text-zinc-500 uppercase">
                          ({flag.entityType} ID: {flag.entityId})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Triggered Trigger: <strong className="text-zinc-200">{flag.flagType.replace(/_/g, ' ')}</strong>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {flag.severity} RISK
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs bg-zinc-900 p-3.5 rounded-xl border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Occurrences vs Safe Threshold
                    </span>
                    <p className="font-mono text-zinc-200 font-bold mt-0.5">
                      {flag.count} incidents (Threshold: {flag.threshold})
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                      Recommended Platform Action
                    </span>
                    <p className="text-zinc-300 mt-0.5">{flag.recommendation}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => handleResolve(flag.id)}
                    className="rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Mark Investigation Resolved
                  </button>
                </div>
              </div>
            )
          })}

          {flags.length === 0 && (
            <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-12 text-center text-xs text-zinc-400">
              <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
              All marketplace quality metrics are within safe operational limits!
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
