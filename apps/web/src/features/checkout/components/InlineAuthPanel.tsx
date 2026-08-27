import { useState, type FocusEvent, type FormEvent } from 'react'
import { Check, ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react'
import { Button } from '../../../components/atoms/Button'
import { Input } from '../../../components/atoms/Input'
import { checkEmail, signInInline, signUpInline } from '../../../lib/api/checkout'
import { setCurrentUser } from '../../../lib/auth'
import type { AuthUser } from '../types'

interface InlineAuthPanelProps {
  onAuthenticated: (user: AuthUser) => void
}

export function InlineAuthPanel({ onAuthenticated }: InlineAuthPanelProps) {
  const [email, setEmail] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [accountExists, setAccountExists] = useState<boolean | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Password validation criteria
  const hasMinLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber
  const passwordsMatch = password === confirmPassword

  const handleEmailBlur = async (e: FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim()
    if (!val || !val.includes('@')) return
    setCheckingEmail(true)
    setError('')
    try {
      const result = await checkEmail({ email: val })
      setAccountExists(result.exists)
    } catch {
      setError('Could not verify email. Please try again.')
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || accountExists === null) return
    setError('')

    if (!accountExists) {
      if (!isPasswordValid) {
        setError('Please fulfill all password requirements before continuing.')
        return
      }
      if (!passwordsMatch) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      if (accountExists) {
        const { user } = await signInInline({ email, password })
        setCurrentUser(user)
        onAuthenticated(user)
      } else {
        const { user } = await signUpInline({ email, password })
        setCurrentUser(user)
        onAuthenticated(user)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[2rem] border border-terracotta/20 bg-cream p-6 shadow-sm transition-all sm:p-8">
      <div className="flex items-center gap-3 text-terracotta">
        <ShieldCheck className="h-6 w-6" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Step 1: Your Account</span>
      </div>

      <h2 className="mt-3 font-display text-3xl text-charcoal">Sign in or create account</h2>
      <p className="mt-1 text-sm leading-6 text-charcoal-70">
        Enter your email address to get started. Your cart items will remain safe.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="relative">
          <Input
            id="inline-email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (accountExists !== null) setAccountExists(null)
            }}
            onBlur={handleEmailBlur}
            required
            autoComplete="email"
          />
          {checkingEmail && (
            <span className="absolute right-3 top-9 text-xs font-medium text-terracotta animate-pulse">
              Checking...
            </span>
          )}
        </div>

        {accountExists !== null && (
          <div className="space-y-4 rounded-2xl bg-cream-dim/60 p-5 border border-charcoal/10 transition-all">
            {accountExists ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sage flex items-center gap-1.5 mb-3">
                  <Check className="h-4 w-4" /> Welcome back! Account found.
                </p>
                <Input
                  id="inline-password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> New customer account setup
                </p>

                <Input
                  id="inline-new-password"
                  type="password"
                  label="Create password"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <Input
                  id="inline-confirm-password"
                  type="password"
                  label="Confirm password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                {/* Password strength criteria */}
                <div className="rounded-xl bg-cream p-4 border border-charcoal/10 text-xs space-y-2">
                  <span className="font-semibold text-charcoal block mb-1">Password requirements:</span>
                  <div className="grid grid-cols-2 gap-2 text-charcoal-70">
                    <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-sage font-medium' : ''}`}>
                      <Check className={`h-3.5 w-3.5 ${hasMinLength ? 'opacity-100' : 'opacity-30'}`} /> 8+ characters
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-sage font-medium' : ''}`}>
                      <Check className={`h-3.5 w-3.5 ${hasUpper ? 'opacity-100' : 'opacity-30'}`} /> Uppercase letter
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasLower ? 'text-sage font-medium' : ''}`}>
                      <Check className={`h-3.5 w-3.5 ${hasLower ? 'opacity-100' : 'opacity-30'}`} /> Lowercase letter
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-sage font-medium' : ''}`}>
                      <Check className={`h-3.5 w-3.5 ${hasNumber ? 'opacity-100' : 'opacity-30'}`} /> Number
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-xl bg-rust/10 p-3.5 text-xs text-rust font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                'Processing...'
              ) : accountExists ? (
                <>
                  <Lock className="h-4 w-4" /> Sign in and continue
                </>
              ) : (
                <>
                  Create account and continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
