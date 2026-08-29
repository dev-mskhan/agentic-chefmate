import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Award,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Search,
  Star,
  Utensils,
  X,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  approveChefApplication,
  getAllChefs,
  getPendingChefs,
  rejectChefApplication,
  restoreChef,
  suspendChef,
  type AdminChefRecord,
  type PendingChefApplication,
} from '../../services/api/adminService'

export function AdminChefsPage() {
  const location = useLocation()
  const isPendingView = location.pathname.includes('/pending')
  const [activeTab, setActiveTab] = useState<'pending' | 'directory'>(
    isPendingView ? 'pending' : 'directory',
  )

  const [pendingChefs, setPendingChefs] = useState<PendingChefApplication[]>([])
  const [allChefs, setAllChefs] = useState<AdminChefRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('Missing verifiable hygiene certificate')
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [targetChefId, setTargetChefId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('Repeated customer quality complaints')

  const loadData = () => {
    Promise.all([getPendingChefs(), getAllChefs()]).then(([pending, all]) => {
      setPendingChefs(pending)
      setAllChefs(all)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (chefId: string) => {
    await approveChefApplication(chefId)
    setActionSuccess('Kitchen certified and approved! Public ordering is now active.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleReject = async () => {
    if (!targetChefId) return
    await rejectChefApplication(targetChefId, rejectReason)
    setRejectModalOpen(false)
    setActionSuccess('Chef application rejected and archived.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleSuspend = async () => {
    if (!targetChefId) return
    await suspendChef(targetChefId, suspendReason)
    setSuspendModalOpen(false)
    setActionSuccess('Chef account suspended.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleRestore = async (chefId: string) => {
    await restoreChef(chefId)
    setActionSuccess('Chef account restored to active status.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const filteredAllChefs = allChefs.filter(
    (c) =>
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <AdminShell
      eyebrow="Kitchen Operations"
      title="Chefs & Verification Console"
      actions={
        <div className="flex items-center gap-2 rounded-pill bg-zinc-900 border border-zinc-800 p-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Award size={14} /> Pending Queue ({pendingChefs.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'directory'
                ? 'bg-terracotta text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Utensils size={14} /> Certified Directory ({allChefs.length})
          </button>
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

        {/* TAB 1: PENDING AUDIT QUEUE */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Applications Awaiting Audit & Certification
                </h3>
                <p className="text-xs text-zinc-400">
                  Verify hygiene certificates, food preparation standards, and delivery capacity before activating.
                </p>
              </div>
            </div>

            {pendingChefs.length === 0 ? (
              <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-12 text-center text-xs text-zinc-400">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                All applicant queues are clear! No pending audits.
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingChefs.map((chef) => (
                  <div
                    key={chef.id}
                    className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 sm:p-6 space-y-4 shadow-sm hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-lg font-bold text-white">
                            {chef.displayName}
                          </h4>
                          <span className="rounded-full bg-amber-500/20 text-amber-400 px-2.5 py-0.5 text-[10px] font-bold border border-amber-500/30">
                            PENDING AUDIT
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Applicant: <strong className="text-zinc-200">{chef.applicantName}</strong> · Phone:{' '}
                          <span className="text-zinc-300">{chef.phone}</span> · Email: {chef.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(chef.id)}
                          className="rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Check size={14} /> Approve & Activate
                        </button>
                        <button
                          onClick={() => {
                            setTargetChefId(chef.id)
                            setRejectModalOpen(true)
                          }}
                          className="rounded-pill bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3.5 py-2 text-xs font-bold transition-colors border border-rose-500/30"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                      "{chef.bio}"
                    </p>

                    {/* Meta Specs Grid */}
                    <div className="grid gap-3 sm:grid-cols-3 text-xs pt-1">
                      <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                          Service Area & Radius
                        </span>
                        <p className="font-bold text-zinc-200">
                          {chef.city} ({chef.serviceArea.radiusKm} km radius)
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {chef.serviceArea.areas.join(', ')}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                          Hygiene Certifications
                        </span>
                        <p className="font-bold text-emerald-400 flex items-center gap-1">
                          <FileCheck size={13} /> Certified
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate" title={chef.hygieneCertificates.join(', ')}>
                          {chef.hygieneCertificates[0]}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-900 p-3 border border-zinc-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block">
                          First Signature Dish
                        </span>
                        <p className="font-bold text-terracotta">
                          {chef.signatureDish.name} (PKR {chef.signatureDish.price.toLocaleString()})
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {chef.signatureDish.category} · {chef.signatureDish.portion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CERTIFIED DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Active & Managed Kitchens Directory
                </h3>
                <p className="text-xs text-zinc-400">
                  Oversee live operational statuses, ratings, order volumes, and enforcement actions.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                <input
                  type="text"
                  placeholder="Filter by kitchen or city…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-pill bg-zinc-900 border border-zinc-800 pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-terracotta w-64"
                />
              </div>
            </div>

            {/* Dense Table UI */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#141417]">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Kitchen & Chef</th>
                    <th className="py-3.5 px-4 font-bold">City</th>
                    <th className="py-3.5 px-4 font-bold">Cuisines</th>
                    <th className="py-3.5 px-4 font-bold">Rating</th>
                    <th className="py-3.5 px-4 font-bold">Orders</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredAllChefs.map((chef) => {
                    const isSuspended = chef.verificationStatus === 'SUSPENDED'
                    return (
                      <tr key={chef.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{chef.displayName}</p>
                          <p className="text-[11px] text-zinc-500">{chef.phone}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-300">{chef.city}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {chef.cuisineSpecialties.map((c) => (
                              <span
                                key={c}
                                className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 font-bold text-zinc-200">
                            <Star size={12} className="fill-saffron text-saffron" />
                            {chef.averageRating.toFixed(1)}
                            <span className="font-normal text-zinc-500">({chef.totalReviews})</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-200 tabular-nums">
                          {chef.totalOrdersCompleted}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {chef.verificationStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/chefs/${chef.id}`}
                              target="_blank"
                              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 p-1.5 text-zinc-400 hover:text-white transition-colors"
                              title="View Public Profile"
                            >
                              <ExternalLink size={13} />
                            </Link>

                            {isSuspended ? (
                              <button
                                onClick={() => handleRestore(chef.id)}
                                className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 text-[11px] font-bold transition-colors"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetChefId(chef.id)
                                  setSuspendModalOpen(true)
                                }}
                                className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 px-2 py-1 text-[11px] font-bold transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-[#18181B] border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white">Reject Chef Application</h3>
              <p className="text-xs text-zinc-400">
                Specify the audit failure rationale that will be recorded and notified to the applicant.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-terracotta"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="rounded-pill px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="rounded-pill bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 text-xs font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend Modal */}
        {suspendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-[#18181B] border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white">Suspend Kitchen Account</h3>
              <p className="text-xs text-zinc-400">
                Suspending this chef prevents them from receiving new orders and pauses their public listing.
              </p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-terracotta"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSuspendModalOpen(false)}
                  className="rounded-pill px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  className="rounded-pill bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 text-xs font-bold"
                >
                  Confirm Suspension
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
