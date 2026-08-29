import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAdminOrders,
  issueOrderRefund,
  type AdminOrderRecord,
} from '../../services/api/adminService'

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED' | 'DISPUTED'>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('Customer complaint resolved via platform mediation')

  const loadData = () => {
    getAdminOrders().then((res) => {
      setOrders(res)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefund = async () => {
    if (!targetOrderId) return
    await issueOrderRefund(targetOrderId, refundReason)
    setRefundModalOpen(false)
    setActionSuccess(`Refund processed for order #${targetOrderId}.`)
    loadData()
    if (selectedOrder?.id === targetOrderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: 'REFUNDED',
              orderStatus: 'CANCELLED',
              hasDispute: false,
              disputeReason: `Refunded: ${refundReason}`,
            }
          : null,
      )
    }
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.chefName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'DISPUTED'
        ? o.hasDispute
        : o.orderStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <AdminShell
      eyebrow="Marketplace Transactions"
      title="Global Orders & Dispute Resolution"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-pill bg-zinc-900 border border-zinc-800 p-1 text-xs">
            {(['ALL', 'DELIVERED', 'CONFIRMED', 'CANCELLED', 'DISPUTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? 'bg-terracotta text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s === 'DISPUTED' ? '⚠️ Disputed' : s}
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

        {/* Search header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Transactions Log ({filteredOrders.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Audit order delivery status, platform fees, and settle mediation claims.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search by order ID, customer or kitchen…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-pill bg-zinc-900 border border-zinc-800 pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-terracotta w-80"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#141417]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-bold">Order ID</th>
                <th className="py-3.5 px-4 font-bold">Customer</th>
                <th className="py-3.5 px-4 font-bold">Kitchen</th>
                <th className="py-3.5 px-4 font-bold">Total Amount</th>
                <th className="py-3.5 px-4 font-bold">Platform Fee</th>
                <th className="py-3.5 px-4 font-bold">Payment</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredOrders.map((order) => {
                const isCancelled = order.orderStatus === 'CANCELLED'
                const isDelivered = order.orderStatus === 'DELIVERED'
                return (
                  <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      #{order.id}
                      {order.hasDispute && (
                        <span className="ml-1.5 inline-block rounded bg-rose-500/20 text-rose-400 px-1.5 py-0.2 text-[9px] font-bold border border-rose-500/30">
                          DISPUTE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-200">
                      {order.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">{order.chefName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-100 tabular-nums">
                      PKR {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-terracotta tabular-nums">
                      PKR {order.platformFee.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                        {order.paymentMethod} · {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isDelivered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCancelled
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:text-white transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Order Details Drawer / Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-lg w-full rounded-3xl bg-[#18181B] border border-zinc-800 p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Order Snapshot
                  </span>
                  <h3 className="font-display text-xl font-bold text-white">
                    Order #{selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl bg-zinc-900 p-3.5 border border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Customer:</span>
                    <strong className="text-zinc-200">{selectedOrder.customerName} ({selectedOrder.customerEmail})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Kitchen:</span>
                    <strong className="text-zinc-200">{selectedOrder.chefName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Delivery Address:</span>
                    <strong className="text-zinc-300 max-w-[240px] text-right truncate">
                      {selectedOrder.deliveryAddress}
                    </strong>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900 p-3.5 border border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Items Ordered:</span>
                    <strong className="text-zinc-200">{selectedOrder.itemsSummary}</strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800/80 pt-2">
                    <span className="text-zinc-400">Gross Total:</span>
                    <strong className="font-mono text-white text-sm">
                      PKR {selectedOrder.totalAmount.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Platform Commission (10%):</span>
                    <strong className="font-mono text-terracotta">
                      PKR {selectedOrder.platformFee.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {selectedOrder.disputeReason && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 space-y-1 text-rose-300">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <AlertTriangle size={13} /> Dispute Context:
                    </span>
                    <p className="text-[11px] leading-relaxed">{selectedOrder.disputeReason}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                {selectedOrder.paymentStatus !== 'REFUNDED' ? (
                  <button
                    onClick={() => {
                      setTargetOrderId(selectedOrder.id)
                      setRefundModalOpen(true)
                    }}
                    className="rounded-pill bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition-colors"
                  >
                    Issue Administrative Refund
                  </button>
                ) : (
                  <span className="rounded-pill bg-zinc-800 px-3 py-1 text-xs text-zinc-400 font-bold">
                    ✓ Refund Settled
                  </span>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Confirmation Modal */}
        {refundModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-[#18181B] border border-zinc-800 p-6 space-y-4 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white">Process Refund for Order #{targetOrderId}</h3>
              <p className="text-xs text-zinc-400">
                This will trigger an automatic gateway credit reversal and mark the order cancelled.
              </p>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-xs text-white outline-none focus:border-terracotta"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRefundModalOpen(false)}
                  className="rounded-pill px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  className="rounded-pill bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 text-xs font-bold"
                >
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
