import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts'
import {
  TrendingUp,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Skeleton } from '../../components/atoms/Skeleton'
import { getChefOverview, type ChefOverviewMetrics } from '../../services/api/chefService'

export function ChefAnalyticsPage() {
  const [metrics, setMetrics] = useState<ChefOverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'YTD'>('7D')

  useEffect(() => {
    getChefOverview()
      .then((data) => setMetrics(data.metrics))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !metrics) {
    return (
      <ChefShell title="Kitchen Analytics & Trends">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </ChefShell>
    )
  }

  return (
    <ChefShell
      title="Kitchen Analytics & Trends"
      subtitle="Performance insights, weekly revenue volume, and customer order counts."
      actions={
        <div className="flex items-center gap-1 rounded-pill bg-cream p-1 border border-charcoal/10 text-xs font-semibold">
          {(['7D', '30D', '90D', 'YTD'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`rounded-pill px-3 py-1 transition-all ${
                timeRange === range
                  ? 'bg-terracotta text-cream shadow-sm'
                  : 'text-charcoal-70 hover:text-charcoal'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Quick summary strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-1">
            <span className="text-xs font-semibold text-charcoal-70">Total Platform Revenue</span>
            <span className="font-display text-3xl font-bold text-charcoal tabular-nums block">
              PKR {metrics.grossEarnings.toLocaleString()}
            </span>
            <p className="text-xs text-sage font-semibold flex items-center gap-1 pt-1">
              <TrendingUp size={13} /> +18.4% compared to last month
            </p>
          </div>

          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-1">
            <span className="text-xs font-semibold text-charcoal-70">Completed Dishes Served</span>
            <span className="font-display text-3xl font-bold text-charcoal tabular-nums block">
              {metrics.completedOrdersCount}
            </span>
            <p className="text-xs text-charcoal-70 pt-1">Across 3 major Lahore delivery zones</p>
          </div>

          <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-1">
            <span className="text-xs font-semibold text-charcoal-70">Repeat Customer Rate</span>
            <span className="font-display text-3xl font-bold text-charcoal tabular-nums block">
              64%
            </span>
            <p className="text-xs text-sage font-semibold pt-1">Strong subscriber retention</p>
          </div>
        </div>

        {/* Weekly Revenue Bar Chart */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-charcoal">Daily Revenue (PKR)</h2>
              <p className="text-xs text-charcoal-70">
                Gross kitchen earnings per day for the selected period.
              </p>
            </div>
            <span className="text-xs font-semibold text-terracotta font-mono">
              Peak: PKR 42,000 (Sat)
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.revenueTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                <XAxis dataKey="date" stroke="#71695f" fontSize={12} tickLine={false} />
                <YAxis stroke="#71695f" fontSize={12} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`PKR ${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#FAF5EE',
                    borderRadius: '16px',
                    borderColor: '#E8DFD1',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#C85A32"
                  radius={[8, 8, 0, 0]}
                  animationDuration={600}
                  animationBegin={100}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Count Line Chart */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <div>
            <h2 className="font-display text-xl text-charcoal">Order Count Distribution</h2>
            <p className="text-xs text-charcoal-70">Daily kitchen dispatch volume.</p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.revenueTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                <XAxis dataKey="date" stroke="#71695f" fontSize={12} tickLine={false} />
                <YAxis stroke="#71695f" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} orders`, 'Volume']}
                  contentStyle={{
                    backgroundColor: '#FAF5EE',
                    borderRadius: '16px',
                    borderColor: '#E8DFD1',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3A6B4F"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#3A6B4F' }}
                  animationDuration={600}
                  animationBegin={150}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ChefShell>
  )
}
