import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Award,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface AdminShellProps {
  children: ReactNode
  title?: string
  eyebrow?: string
  actions?: ReactNode
}

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: Home },
  { label: 'Pending Approvals', href: '/admin/chefs/pending', icon: Award, badge: 4, badgeTone: 'amber' as const },
  { label: 'Chefs Directory', href: '/admin/chefs', icon: Utensils },
  { label: 'User Directory', href: '/admin/users', icon: Users },
  { label: 'Orders & Disputes', href: '/admin/orders', icon: ShoppingBag, badge: 1, badgeTone: 'rose' as const },
  { label: 'Payouts & Ledger', href: '/admin/payouts', icon: CreditCard },
  { label: 'Review Moderation', href: '/admin/reviews', icon: MessageSquare },
  { label: 'Quality & Risk', href: '/admin/quality', icon: AlertTriangle, badge: 3, badgeTone: 'rose' as const },
  { label: 'Security Audit Log', href: '/admin/audit-log', icon: ClipboardList },
  { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
]

export function AdminShell({ children, title, eyebrow, actions }: AdminShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, switchRole } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Role Gate: Must be logged in as ADMIN
  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#09090B] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-[#18181B] border border-zinc-800 p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-terracotta-10 text-terracotta border border-terracotta/20">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-slate-100">
              Admin Access Required
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This console is restricted to authenticated platform operations staff and system administrators.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full rounded-pill bg-terracotta hover:bg-terracotta-dark text-white py-3 text-xs font-bold transition-colors shadow-lg"
            >
              Sign In with Admin Credentials
            </button>
            <button
              onClick={() => {
                switchRole('ADMIN')
              }}
              className="w-full rounded-pill bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 text-xs font-semibold transition-colors"
            >
              Simulate Admin Session (Fixture)
            </button>
            <Link
              to="/"
              className="block text-xs text-zinc-500 hover:text-zinc-300 pt-2"
            >
              ← Return to Public Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSignOut = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex font-sans antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#121215] border-r border-zinc-800/80 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span className="font-display text-xl font-bold tracking-tight text-white">
              chefmate<span className="text-terracotta">.</span>
            </span>
            <span className="rounded bg-terracotta/20 text-terracotta px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-terracotta/30">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-semibold">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                  active
                    ? 'bg-terracotta text-white shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={active ? 'text-white' : 'text-zinc-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : item.badgeTone === 'amber'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer: Quick switcher & Sign Out */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Operator</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <p className="font-bold text-zinc-200 truncate">{user.displayName || user.email}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 p-2 text-center text-[11px] font-semibold text-zinc-300 transition-colors"
            >
              Public App
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors px-3"
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F0F12]">
        {/* Top Header */}
        <header className="h-16 bg-[#121215] border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-zinc-400 hover:text-white p-1"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb Info */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="font-bold text-zinc-300">Admin</span>
              <ChevronRight size={13} className="text-zinc-600" />
              <span className="text-terracotta font-semibold capitalize">
                {location.pathname.replace('/admin/', '').replace('/admin', 'Overview') || 'Overview'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Quick search records…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-pill bg-zinc-900 border border-zinc-800 pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta/30 w-48 sm:w-64"
              />
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 rounded-pill bg-zinc-900 border border-zinc-800 px-3 py-1 text-[11px] text-zinc-400">
              <ShieldCheck size={13} className="text-emerald-400" /> Audit Logged
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Header Title & Actions Strip */}
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/60">
              <div>
                {eyebrow && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta block">
                    {eyebrow}
                  </span>
                )}
                {title && (
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {title}
                  </h1>
                )}
              </div>
              {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
