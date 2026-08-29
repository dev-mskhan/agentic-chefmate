import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { AuthShell } from '../../components/templates/AuthShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { useAuth } from '../../hooks/useAuth'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const returnTo = searchParams.get('returnTo') || '/orders'

  const { user } = useAuth()
  const [verifying, setVerifying] = useState(Boolean(token))
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState(user?.email || '')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      setVerifying(true)
      // Simulate backend verifyEmail procedure verification
      const timer = setTimeout(() => {
        if (token === 'invalid' || token === 'expired') {
          setError('This verification link is invalid or has expired.')
          setVerifying(false)
        } else {
          setVerified(true)
          setVerifying(false)
        }
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [token])

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return

    setResending(true)
    setError('')
    setTimeout(() => {
      setResending(false)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    }, 600)
  }

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=85"
      imageAlt="Verified home cooking on ChefMate"
      brandCopy="Verify your email to start exploring authentic small-batch food in your area."
    >
      <div className="space-y-6">
        {/* State 1: Verification in Progress */}
        {verifying && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta-10 text-terracotta animate-pulse">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-charcoal">
              Verifying your email…
            </h1>
            <p className="text-xs text-charcoal-70 max-w-sm mx-auto">
              Please wait a moment while we validate your secure verification link.
            </p>
          </div>
        )}

        {/* State 2: Verification Succeeded */}
        {!verifying && verified && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/15 text-sage">
              <CheckCircle2 size={36} />
            </div>

            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-pill bg-sage/15 px-3 py-0.5 text-xs font-bold text-sage">
                <ShieldCheck size={14} /> Email Verified
              </span>
              <h1 className="font-display text-3xl text-charcoal tracking-tight">
                Account confirmed!
              </h1>
              <p className="text-xs text-charcoal-70 max-w-sm mx-auto">
                Your email address has been successfully verified. You can now access your account and explore local kitchens.
              </p>
            </div>

            <Button
              onClick={() => navigate(returnTo)}
              className="w-full py-3 text-xs gap-2 justify-center"
            >
              Continue to {returnTo.includes('chef') ? 'Chef Onboarding' : 'Explore Chefs'} <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* State 3: Token Invalid or Expired */}
        {!verifying && error && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rust/15 text-rust">
              <XCircle size={36} />
            </div>

            <div className="text-center space-y-1.5">
              <h1 className="font-display text-2xl text-charcoal">
                Verification link expired
              </h1>
              <p className="text-xs text-charcoal-70 max-w-sm mx-auto">
                {error} Verification links expire after 20 minutes for account security.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {resendSuccess && (
                <div className="rounded-xl bg-sage/15 p-3 text-xs font-bold text-sage border border-sage/20">
                  New verification link sent to your inbox!
                </div>
              )}

              <Button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 text-xs gap-2 justify-center"
              >
                <Mail size={14} /> {resending ? 'Sending...' : 'Resend Verification Link'}
              </Button>
            </form>
          </div>
        )}

        {/* State 4: Initial Prompt (No token in URL) — "Check your inbox" */}
        {!token && !verifying && !verified && (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta-10 text-terracotta">
              <Mail size={32} />
            </div>

            <div className="text-center space-y-1.5">
              <h1 className="font-display text-3xl text-charcoal tracking-tight">
                Verify your email
              </h1>
              <p className="text-xs text-charcoal-70 max-w-sm mx-auto">
                We sent a secure activation link to <strong>{resendEmail || 'your email'}</strong>. Click the link in your inbox to confirm your account.
              </p>
            </div>

            <div className="rounded-2xl bg-cream-dim p-4 border border-charcoal/10 space-y-2 text-xs text-charcoal-70">
              <p className="font-bold text-charcoal">Didn't receive the email?</p>
              <p className="text-[11px] leading-relaxed">
                Check your spam or promotions folder, or request a fresh verification link below.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-charcoal">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {resendSuccess && (
                <div className="rounded-xl bg-sage/15 p-3 text-xs font-bold text-sage border border-sage/20">
                  New verification link sent to your inbox!
                </div>
              )}

              <Button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 text-xs gap-2 justify-center"
              >
                <RefreshCw size={14} /> {resending ? 'Sending...' : 'Resend Verification Link'}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link
                to={returnTo}
                className="text-xs font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
              >
                Proceed to {returnTo.includes('chef') ? 'Chef Onboarding' : 'Dashboard'} <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
