import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Check } from 'lucide-react'
import { AuthShell } from '../../components/templates/AuthShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { setCurrentUser } from '../../lib/auth'

export function SignUpPage() {
  const navigate = useNavigate()

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
      navigate('/orders')
    }, 450)
  }

  return (
    <AuthShell
      image="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85"
      imageAlt="Authentic handmade meal preparation"
      brandCopy="Join ChefMate to discover authentic home kitchens in your city."
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-charcoal-70 mt-1.5">
            Order small-batch family recipes cooked fresh by local master chefs.
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
            {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-xs text-charcoal-70">
          Already have an account?{' '}
          <Link to="/signin" className="font-bold text-terracotta hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
