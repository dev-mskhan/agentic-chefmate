import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Power,
  Settings,
  Star,
  User,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../services/api/chatService'

interface ChefShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function ChefShell({ title, subtitle, actions, children }: ChefShellProps) {
  const { user, logout, switchRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [kitchenActive, setKitchenActive] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    getUnreadCount('CHEF')
      .then((res) => setUnreadMessages(res.unreadCount))
      .catch(() => {})
  }, [])

  const navItems = [
    { label: 'Overview', href: '/chef', icon: LayoutDashboard },
    { label: 'Order Queue', href: '/chef/orders', icon: ClipboardList, badge: '3' },
    {
      label: 'Messages',
      href: '/chef/messages',
      icon: MessageSquare,
      badge: unreadMessages > 0 ? String(unreadMessages) : undefined,
    },
    { label: 'Dishes', href: '/chef/dishes', icon: Utensils },
    { label: 'Meal Plans', href: '/chef/plans', icon: CalendarDays },
    { label: 'Schedule & Capacity', href: '/chef/schedule', icon: Clock },
    { label: 'Analytics', href: '/chef/analytics', icon: BarChart3 },
    { label: 'Earnings & Payouts', href: '/chef/earnings', icon: Wallet },
    { label: 'Reviews', href: '/chef/reviews', icon: Star },
    { label: 'Settings', href: '/chef/settings', icon: Settings },
  ]

  const chefId = 'chef-ayesha-khan'

  return (
    <div className="min-h-screen bg-cream-dim text-charcoal flex flex-col md:flex-row">
      {/* ── Left Sidebar (Espresso Dark Theme) ─────────────────────────── */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col justify-between bg-[#1A1612] text-cream p-5 shrink-0 border-r border-[#2C251F] sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Brand & Kitchen identity */}
          <div className="space-y-2">
            <Link to="/" className="font-display text-2xl tracking-tight text-cream">
              chefmate<span className="text-terracotta">.</span>
            </Link>
            <div className="rounded-2xl bg-[#241F1A] p-3 border border-[#362E27] flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-saffron">
                  Calm Kitchen
                </span>
                <strong className="block text-xs font-bold text-cream truncate">
                  {user?.displayName || "Ayesha's Lahore Dastarkhwan"}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setKitchenActive(!kitchenActive)}
                title={kitchenActive ? 'Kitchen is accepting orders' : 'Kitchen is paused'}
                className={`p-1.5 rounded-full text-xs transition-colors ${
                  kitchenActive
                    ? 'bg-sage/20 text-sage hover:bg-sage/30'
                    : 'bg-terracotta/20 text-terracotta hover:bg-terracotta/30'
                }`}
              >
                <Power size={14} />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-medium" aria-label="Chef Navigation">
            {navItems.map(({ label, href, icon: Icon, badge }) => {
              const active = location.pathname === href
              return (
                <Link
                  key={href}
                  to={href}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all ${
                    active
                      ? 'bg-terracotta text-cream font-bold shadow-sm'
                      : 'text-cream/70 hover:bg-[#28221D] hover:text-cream'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} className={active ? 'text-cream' : 'text-saffron'} />
                    {label}
                  </span>
                  {badge && (
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${
                        active ? 'bg-cream text-terracotta' : 'bg-terracotta text-cream'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 pt-4 border-t border-[#2C251F]">
          <Link
            to={`/chefs/${chefId}`}
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-cream/70 hover:bg-[#28221D] hover:text-cream transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} className="text-terracotta" />
              Public Kitchen Page
            </span>
            <ChevronRight size={14} />
          </Link>

          <button
            type="button"
            onClick={() => {
              switchRole('USER')
              navigate('/orders')
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-cream/70 hover:bg-[#28221D] hover:text-cream transition-colors text-left"
          >
            <User size={14} className="text-saffron" />
            Switch to Customer Mode
          </button>

          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-terracotta hover:bg-terracotta/10 transition-colors text-left"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ─────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-[#1A1612] text-cream p-4 border-b border-[#2C251F] sticky top-0 z-30">
        <Link to="/" className="font-display text-xl tracking-tight text-cream">
          chefmate<span className="text-terracotta">.</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-full text-cream hover:bg-[#28221D]"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-0 bg-[#1A1612] text-cream p-5 z-40 overflow-y-auto space-y-4">
          <nav className="space-y-1 text-sm font-medium">
            {navItems.map(({ label, href, icon: Icon, badge }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-between rounded-xl p-3 text-cream/80 hover:bg-[#28221D]"
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} className="text-saffron" /> {label}
                </span>
                {badge && (
                  <span className="rounded-pill bg-terracotta px-2 py-0.5 text-xs text-cream">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 max-w-7xl">
        {/* Top bar header strip */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal/10 pb-6 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-charcoal-70 mt-1">{subtitle}</p>}
          </div>

          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>

        {children}
      </main>
    </div>
  )
}
