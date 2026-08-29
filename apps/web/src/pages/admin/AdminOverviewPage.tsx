import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CreditCard,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminShell } from '../../components/templates/AdminShell'
import {
  getAdminOverview,
  getPlatformMetrics,
  getQualityFlags,
  type AdminOverviewStats,
  type MetricTimeSeriesPoint,
  type QualityFlagItem,
} from '../../services/api/adminService'

export function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null)
  const [metrics, setMetrics] = useState<MetricTimeSeriesPoint[]>([])
  const [flags, setFlags] = useState<QualityFlagItem[]>([])
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    Promise.all([getAdminOverview(), getPlatformMetrics(), getQualityFlags()]).then(
      ([s, m, f]) => {
        setStats(s)
        setMetrics(m)
        setFlags(f)
      },
    )
  }, [])

  return (
    <AdminShell
      eyebrow="Marketplace Control"
      title="Platform Operations Overview"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-pill bg-zinc-900 border border-zinc-800 p-1 text-xs">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  dateRange === range
                    ? 'bg-terracotta text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Operational Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Gross Volume (GMV)</span>
              <DollarSign size={16} className="text-terracotta" />
            </div>
            <p className="font-display text-2xl font-bold text-white tabular-nums">
              PKR {(stats?.totalGrossMarketplaceVolume ?? 4850000).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <TrendingUp size={13} /> +18.4% this month
            </div>
          </div>

          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Platform Net Revenue (10%)</span>
              <CreditCard size={16} className="text-saffron" />
            </div>
            <p className="font-display text-2xl font-bold text-white tabular-nums">
              PKR {(stats?.platformCommissionRevenue ?? 485000).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <TrendingUp size={13} /> +15.2% net margin
            </div>
          </div>

          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Total Orders Completed</span>
              <ShoppingBag size={16} className="text-emerald-400" />
            </div>
            <p className="font-display text-2xl font-bold text-white tabular-nums">
              {(stats?.completedOrders ?? 1310).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              {stats?.cancelledOrders ?? 38} cancelled ({((38 / 1420) * 100).toFixed(1)}%)
            </div>
          </div>

          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Active Customer Community</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <p className="font-display text-2xl font-bold text-white tabular-nums">
              {(stats?.activeUsers ?? 1620).toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              {stats?.activeSubscriptions ?? 145} active meal subscriptions
            </div>
          </div>
        </div>

        {/* Action Priority Callouts */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/admin/chefs/pending"
            className="group rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center justify-between hover:bg-amber-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold">
                <Award size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300">
                  {stats?.pendingChefs ?? 4} Pending Chef Audits
                </p>
                <p className="text-[11px] text-zinc-400">Hygiene & profile certifications</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/orders"
            className="group rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between hover:bg-rose-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-bold">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-300">
                  {stats?.disputedOrders ?? 1} Order Dispute Open
                </p>
                <p className="text-[11px] text-zinc-400">Delivery refund review required</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-rose-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/payouts"
            className="group rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between hover:bg-emerald-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  PKR {(stats?.pendingPayoutsAmount ?? 164000).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400">Weekly disbursements batch</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Charts & Timeline */}
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
          {/* GMV Growth Chart */}
          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Marketplace GMV & Volume Trajectory
                </h3>
                <p className="text-xs text-zinc-400">Daily gross turnover in PKR</p>
              </div>
              <span className="text-xs font-bold text-terracotta tabular-nums">
                30-Day Growth
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9552C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C9552C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="date" stroke="#71717A" fontSize={11} />
                  <YAxis
                    stroke="#71717A"
                    fontSize={11}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      borderColor: '#3F3F46',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F4F4F5',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="gmv"
                    stroke="#C9552C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gmvGradient)"
                    animationDuration={600}
                    animationBegin={100}
                    animationEasing="ease-out"
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quality & Risk Alerts Panel */}
          <div className="rounded-2xl bg-[#141417] border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Risk & Quality Thresholds
                </h3>
                <p className="text-xs text-zinc-400">Automated event monitoring</p>
              </div>
              <Link
                to="/admin/quality"
                className="text-xs font-bold text-terracotta hover:underline"
              >
                View all ({flags.length})
              </Link>
            </div>

            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{flag.entityName}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        flag.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {flag.flagType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {flag.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
