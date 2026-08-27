import { useState, type FormEvent } from 'react'
import { CreditCard, Lock, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '../../../components/atoms/Button'
import { Input } from '../../../components/atoms/Input'
import { confirmStripePayment } from '../../../lib/api/checkout'

interface StripePaymentFormProps {
  clientSecret: string
  totalAmount: number
  currency: string
  onPaymentSuccess: () => void
  onPaymentFailed: (errorMsg: string) => void
}

export function StripePaymentForm({
  clientSecret,
  totalAmount,
  currency,
  onPaymentSuccess,
  onPaymentFailed,
}: StripePaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242')
  const [expiry, setExpiry] = useState('12/28')
  const [cvc, setCvc] = useState('123')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [simulateDecline, setSimulateDecline] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await confirmStripePayment(
        clientSecret,
        { number: cardNumber, expMonth: '12', expYear: '2028', cvc },
        simulateDecline,
      )

      if (res.success) {
        onPaymentSuccess()
      } else {
        const errMsg = res.error || 'Your payment could not be processed.'
        setError(errMsg)
        onPaymentFailed(errMsg)
      }
    } catch {
      const errMsg = 'Payment gateway error. Please try again.'
      setError(errMsg)
      onPaymentFailed(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-terracotta/20 bg-cream p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-terracotta">
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Secure Card Details</span>
        </div>
        <span className="rounded-pill bg-cream-dim px-2.5 py-1 text-[11px] font-semibold text-charcoal-70">
          256-Bit SSL Secured
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="stripe-card-number"
          label="Card Number"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="stripe-expiry"
            label="Expires (MM/YY)"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="12/28"
            required
          />
          <Input
            id="stripe-cvc"
            label="CVC / Security Code"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            placeholder="123"
            type="password"
            maxLength={4}
            required
          />
        </div>

        {/* Test simulation option */}
        <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-charcoal">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={simulateDecline}
              onChange={(e) => setSimulateDecline(e.target.checked)}
              className="accent-rust rounded"
            />
            <span className="text-rust font-semibold">Test card decline flow</span>
          </label>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-rust/10 p-3.5 text-xs text-rust font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" className="w-full gap-2 py-3" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Processing payment...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Pay {currency} {totalAmount.toLocaleString()}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
