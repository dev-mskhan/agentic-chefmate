import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Search,
  X,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAdminUsers,
  restoreUser,
  suspendUser,
  type AdminUserRecord,
} from '../../services/api/adminService'

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'CHEF' | 'ADMIN'>('ALL')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('Abusive behavior or policy violation')

  const loadData = () => {
    getAdminUsers().then((res) => {
      setUsers(res)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSuspend = async () => {
    if (!targetUserId) return
    await suspendUser(targetUserId, suspendReason)
    setSuspendModalOpen(false)
    setActionSuccess('User account suspended.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleRestore = async (userId: string) => {
    await restoreUser(userId)
    setActionSuccess('User account restored to active status.')
    loadData()
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <AdminShell
      eyebrow="Identity & Security"
      title="User Accounts & Roles"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-pill bg-zinc-900 border border-zinc-800 p-1 text-xs">
            {(['ALL', 'USER', 'CHEF', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  roleFilter === r
                    ? 'bg-terracotta text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
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

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Platform Registered Users ({filteredUsers.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Manage accounts, investigate abuse flags, and review lifetime spend.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search by name, email or phone…"
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
                <th className="py-3.5 px-4 font-bold">User Identity</th>
                <th className="py-3.5 px-4 font-bold">Contact</th>
                <th className="py-3.5 px-4 font-bold">City</th>
                <th className="py-3.5 px-4 font-bold">Role</th>
                <th className="py-3.5 px-4 font-bold">Orders</th>
                <th className="py-3.5 px-4 font-bold">Total Spent</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredUsers.map((user) => {
                const isSuspended = user.status === 'SUSPENDED'
                return (
                  <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{user.displayName}</p>
                      <p className="text-[11px] text-zinc-500">ID: {user.id}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      <p className="text-zinc-300">{user.email}</p>
                      <p className="text-zinc-500">{user.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-300">{user.city}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : user.role === 'CHEF'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-200 tabular-nums">
                      {user.totalOrders}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-100 tabular-nums">
                      PKR {user.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSuspended
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {user.role !== 'ADMIN' && (
                        <div>
                          {isSuspended ? (
                            <button
                              onClick={() => handleRestore(user.id)}
                              className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 py-1 text-[11px] font-bold transition-colors"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setTargetUserId(user.id)
                                setSuspendModalOpen(true)
                              }}
                              className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 px-2.5 py-1 text-[11px] font-bold transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Suspend Modal */}
        {suspendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-[#18181B] border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white">Suspend User Account</h3>
              <p className="text-xs text-zinc-400">
                Suspending this user invalidates their active sessions and blocks future orders.
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
