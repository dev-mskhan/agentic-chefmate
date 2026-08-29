import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'
import { loginFixtureUser, setCurrentUser } from '../../lib/auth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@chefmate.pk')
  const [password, setPassword] = useState('SuperAdmin2026!')
  const [securityToken, setSecurityToken] = useState('789124')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your administrator credentials.')
      return
    }

    setLoading(true)
    setError('')

    setTimeout(() => {
      // Set admin user session
      setCurrentUser({
        id: 'user-admin-01',
        email,
        displayName: 'Platform Operations Admin',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
      })
      setLoading(false)
      navigate('/admin')
    }, 450)
  }

  const handleQuickDemoAdmin = () => {
    setLoading(true)
    setTimeout(() => {
      loginFixtureUser('ADMIN')
      setLoading(false)
      navigate('/admin')
    }, 300)
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased">
      {/* Top Brand Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            chefmate<span className="text-terracotta">.</span>
          </span>
          <span className="rounded bg-zinc-800 text-zinc-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-700">
            Console
          </span>
        </Link>

        <Link
          to="/"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          ← Public Marketplace
        </Link>
      </div>

      {/* Center Login Box */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="rounded-3xl bg-[#141417] border border-zinc-800 p-7 sm:p-9 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Secure Operations Gateway
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Administrator Login
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Restricted management console for marketplace moderation, chef approvals, payout disbursements, and quality audits.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/15 p-3 text-xs font-semibold text-rose-400 border border-rose-500/25">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="admin-email">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-pill border border-zinc-700 bg-zinc-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  placeholder="admin@chefmate.pk"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="admin-password">
                Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-pill border border-zinc-700 bg-zinc-900/90 pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="admin-token">
                2FA / Security Key Token (TOTP)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  id="admin-token"
                  type="text"
                  value={securityToken}
                  onChange={(e) => setSecurityToken(e.target.value)}
                  className="w-full rounded-pill border border-zinc-700 bg-zinc-900/90 pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  placeholder="6-digit security code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-terracotta hover:bg-terracotta-dark text-white py-3 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Authenticating…' : 'Authorize & Enter Console'} <ArrowRight size={15} />
            </button>
          </form>

          {/* Quick fixture button */}
          <div className="pt-2 border-t border-zinc-800 space-y-3">
            <button
              type="button"
              onClick={handleQuickDemoAdmin}
              className="w-full rounded-pill bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              1-Click Fill Administrator Session
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
              Internal system access. All sessions and actions are logged to the platform security audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-600">
        ChefMate Platform Operations Console · Authorized Personnel Only
      </div>
    </div>
  )
}
