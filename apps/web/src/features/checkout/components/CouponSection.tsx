import { useState, type FormEvent } from 'react'
import { Tag, Check, X } from 'lucide-react'
import { Button } from '../../../components/atoms/Button'
import { Input } from '../../../components/atoms/Input'
import { validateCoupon } from '../../../lib/api/checkout'

interface CouponSectionProps {
  chefId: string
  appliedCoupon?: string
  onApplyCoupon: (code: string | undefined) => void
  disabled?: boolean
}

export function CouponSection({ chefId, appliedCoupon, onApplyCoupon, disabled = false }: CouponSectionProps) {
  const [code, setCode] = useState(appliedCoupon || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = async (e: FormEvent) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (!clean) return

    setLoading(true)
    setError('')
    try {
      const res = await validateCoupon(clean, chefId)
      if (res.valid) {
        onApplyCoupon(res.code)
      } else {
        setError(res.reason || 'Invalid or expired coupon code.')
        onApplyCoupon(undefined)
      }
    } catch {
      setError('Could not validate coupon. Try again.')
      onApplyCoupon(undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    setCode('')
    setError('')
    onApplyCoupon(undefined)
  }

  return (
    <div className={`rounded-2xl border border-charcoal/10 bg-cream p-6 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 text-terracotta mb-2">
        <Tag className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Promo Code</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-terracotta-10 p-3.5 border border-terracotta/20 text-xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-terracotta" />
            <span className="font-semibold text-terracotta-dark">Coupon '{appliedCoupon}' applied!</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 text-charcoal-70 hover:text-rust text-xs font-medium"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="space-y-2">
          <div className="flex items-end gap-2 sm:grid sm:grid-cols-[1fr_auto]">
            <Input
              id="checkout-coupon"
              placeholder="e.g. WELCOME10"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                if (error) setError('')
              }}
              className="uppercase font-mono tracking-wider text-xs"
            />
            <Button type="submit" variant="secondary" className="text-xs px-4" disabled={loading || !code.trim()}>
              {loading ? 'Applying...' : 'Apply'}
            </Button>
          </div>

          {error && (
            <div role="alert" className="flex items-center justify-between rounded-xl bg-rust/10 p-3 text-xs text-rust font-medium">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-rust/70 hover:text-rust">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
