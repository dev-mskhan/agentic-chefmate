import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Check, ChefHat } from 'lucide-react'
import { AuthShell } from '../../components/templates/AuthShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { setCurrentUser, loginFixtureUser } from '../../lib/auth'

export function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || searchParams.get('redirect') || '/orders'
  const isChefIntent = returnTo.includes('chef') || searchParams.get('mode') === 'chef'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password validation rules per CONTEXT.md §8: min 8 chars, uppercase, lowercase, number
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all complexity requirements.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    setTimeout(() => {
      setCurrentUser({
        id: `user-${Date.now()}`,
        email,
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        role: 'USER',
      })
      setLoading(false)
      navigate(returnTo)
    }, 450)
  }

  const handleGoogleSignUp = () => {
    setLoading(true)
    setTimeout(() => {
      loginFixtureUser('USER')
      setLoading(false)
      navigate(returnTo)
    }, 500)
  }

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85"
      imageAlt="Authentic handmade meal preparation"
      brandCopy={
        isChefIntent
          ? 'Start your home culinary journey and share your family recipes with local food lovers.'
          : 'Join ChefMate to discover authentic home kitchens in your city.'
      }
    >
      <div className="space-y-6">
        <div>
          {isChefIntent && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-terracotta-10 text-terracotta px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
              <ChefHat size={14} /> Chef Partner Registration
            </span>
          )}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight">
            {isChefIntent ? 'Create your chef account' : 'Create your account'}
          </h1>
          <p className="text-sm text-charcoal-70 mt-1.5">
            {isChefIntent
              ? 'Create your credentials first, then complete your kitchen onboarding details.'
              : 'Order small-batch family recipes cooked fresh by local master chefs.'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-terracotta-10 p-3 text-xs font-semibold text-terracotta border border-terracotta/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-charcoal" htmlFor="signup-firstname">
                First name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 h-4 w-4" />
                <Input
                  id="signup-firstname"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Tariq"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-charcoal" htmlFor="signup-lastname">
                Last name
              </label>
              <Input
                id="signup-lastname"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Mahmood"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal" htmlFor="signup-email">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 h-4 w-4" />
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal" htmlFor="signup-password">
              Create password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 h-4 w-4" />
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 hover:text-charcoal"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength checklist */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-charcoal-70">
              <span className={`flex items-center gap-1 ${hasMinLength ? 'text-sage font-semibold' : ''}`}>
                <Check size={12} className={hasMinLength ? 'text-sage' : 'text-charcoal/30'} />
                8+ characters
              </span>
              <span className={`flex items-center gap-1 ${hasUppercase ? 'text-sage font-semibold' : ''}`}>
                <Check size={12} className={hasUppercase ? 'text-sage' : 'text-charcoal/30'} />
                Uppercase letter
              </span>
              <span className={`flex items-center gap-1 ${hasLowercase ? 'text-sage font-semibold' : ''}`}>
                <Check size={12} className={hasLowercase ? 'text-sage' : 'text-charcoal/30'} />
                Lowercase letter
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-sage font-semibold' : ''}`}>
                <Check size={12} className={hasNumber ? 'text-sage' : 'text-charcoal/30'} />
                Number
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal" htmlFor="signup-confirm-password">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-70 h-4 w-4" />
              <Input
                id="signup-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-3 text-sm gap-2">
            {loading
              ? 'Creating Account...'
              : isChefIntent
              ? 'Create Account & Continue to Onboarding'
              : 'Create Account'}{' '}
            <ArrowRight size={16} />
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-charcoal/10" />
          </div>
          <span className="relative bg-cream px-3 text-xs text-charcoal-70">or continue with</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="flex w-full items-center justify-center gap-3 rounded-pill border border-charcoal/15 bg-cream px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-dim transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs text-charcoal-70">
          Already have an account?{' '}
          <Link
            to={`/signin?returnTo=${encodeURIComponent(returnTo)}`}
            className="font-bold text-terracotta hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
