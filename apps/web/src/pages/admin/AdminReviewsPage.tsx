import { useEffect, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Flag,
  Star,
  X,
  XCircle,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAdminReviews,
  moderateReview,
  type AdminReviewRecord,
} from '../../services/api/adminService'

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewRecord[]>([])
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PUBLISHED' | 'REJECTED'>('ALL')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadData = () => {
    getAdminReviews().then((res) => {
      setReviews(res)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleModerate = async (reviewId: string, status: 'PUBLISHED' | 'REJECTED') => {
    await moderateReview(reviewId, status)
    setActionSuccess(`Review marked as ${status.toLowerCase()}.`)
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const filteredReviews = reviews.filter(
    (r) => filterStatus === 'ALL' || r.status === filterStatus,
  )

  return (
    <AdminShell
      eyebrow="Community & Content"
      title="Customer Review Moderation"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-pill bg-zinc-900 border border-zinc-800 p-1 text-xs">
            {(['ALL', 'PENDING', 'PUBLISHED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  filterStatus === s
                    ? 'bg-terracotta text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
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

        <div className="grid gap-4">
          {filteredReviews.map((rev) => {
            const isPublished = rev.status === 'PUBLISHED'
            const isRejected = rev.status === 'REJECTED'

            return (
              <div
                key={rev.id}
                className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">{rev.authorName}</span>
                    <span className="text-xs text-zinc-500">reviewed</span>
                    <span className="text-xs font-semibold text-terracotta">
                      {rev.targetName} ({rev.targetType})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isPublished
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {rev.status}
                    </span>
                    <div className="flex items-center gap-0.5 text-xs font-bold text-saffron">
                      <Star size={13} className="fill-saffron" />
                      {rev.rating} / 5
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                  "{rev.text}"
                </p>

                {rev.flags && rev.flags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                      <Flag size={11} /> Auto Flags:
                    </span>
                    {rev.flags.map((f) => (
                      <span
                        key={f}
                        className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-semibold border border-rose-500/30"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  {!isPublished && (
                    <button
                      onClick={() => handleModerate(rev.id, 'PUBLISHED')}
                      className="rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Check size={13} /> Approve & Publish
                    </button>
                  )}
                  {!isRejected && (
                    <button
                      onClick={() => handleModerate(rev.id, 'REJECTED')}
                      className="rounded-pill bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3.5 py-1.5 text-xs font-bold transition-colors border border-rose-500/30 flex items-center gap-1"
                    >
                      <XCircle size={13} /> Quarantine as Spam
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminShell>
  )
}
