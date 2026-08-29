import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import { AuthShell } from '../../components/templates/AuthShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 400)
  }

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85"
      imageAlt="Fresh home-cooked food ingredients"
      brandCopy="We make it easy to recover access to your favorite kitchen orders."
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight">
            Reset password
          </h1>
          <p className="text-sm text-charcoal-70 mt-1.5">
            Enter the email address associated with your ChefMate account.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-sage/15 p-6 border border-sage/30 space-y-3">
            <div className="flex items-center gap-2 text-sage font-bold text-sm">
              <CheckCircle2 size={18} /> Reset link sent
            </div>
            <p className="text-xs leading-5 text-charcoal">
              If an account exists for <strong>{email}</strong>, a password reset link has been dispatched to your inbox.
            </p>
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:underline pt-2"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-charcoal" htmlFor="reset-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 h-4 w-4" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-3 text-sm">
              {loading ? 'Sending link...' : 'Send Password Reset Link'}
            </Button>

            <p className="text-center text-xs text-charcoal-70">
              Remember your password?{' '}
              <Link to="/signin" className="font-bold text-terracotta hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
