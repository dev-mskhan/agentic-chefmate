import { useEffect, useState } from 'react'
import { CreditCard, Banknote, ShieldCheck, Lock } from 'lucide-react'
import { Button } from '../../../components/atoms/Button'
import { StripePaymentForm } from './StripePaymentForm'
import type { PaymentMethod } from '../types'

interface PaymentMethodStepProps {
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  idempotencyKey?: string
  totalAmount: number
  currency: string
  clientSecret?: string
  submitting: boolean
  onSubmitCheckout: () => void
  onPaymentSuccess: () => void
  onPaymentFailed: (errorMsg: string) => void
  disabled?: boolean
}

export function PaymentMethodStep({
  paymentMethod,
  onPaymentMethodChange,
  totalAmount,
  currency,
  clientSecret,
  submitting,
  onSubmitCheckout,
  onPaymentSuccess,
  onPaymentFailed,
  disabled = false,
}: PaymentMethodStepProps) {
  const [mountedStripe, setMountedStripe] = useState(false)

  useEffect(() => {
    if (paymentMethod === 'STRIPE' && clientSecret) {
      setMountedStripe(true)
    }
  }, [paymentMethod, clientSecret])

  return (
    <div className={`rounded-2xl border border-charcoal/10 bg-cream p-6 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 text-terracotta">
          <CreditCard className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Payment Method</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-sage font-medium">
          <Lock className="h-3.5 w-3.5" />
          <span>Encrypted Checkout</span>
        </div>
      </div>

      <h3 className="mt-1 font-display text-xl text-charcoal">How would you like to pay?</h3>

      {/* Payment Method Selector */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label
          onClick={() => {
            onPaymentMethodChange('STRIPE')
            setMountedStripe(false)
          }}
          className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-all ${
            paymentMethod === 'STRIPE'
              ? 'border-terracotta bg-terracotta-10 shadow-sm'
              : 'border-charcoal/10 bg-cream hover:border-charcoal/20'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="STRIPE"
            checked={paymentMethod === 'STRIPE'}
            onChange={() => {
              onPaymentMethodChange('STRIPE')
              setMountedStripe(false)
            }}
            className="accent-terracotta"
          />
          <div>
            <span className="font-semibold text-charcoal text-sm flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-terracotta" /> Credit / Debit Card
            </span>
            <span className="mt-0.5 block text-xs text-charcoal-70">Pay online securely via Visa or Mastercard</span>
          </div>
        </label>

        <label
          onClick={() => onPaymentMethodChange('COD')}
          className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-all ${
            paymentMethod === 'COD'
              ? 'border-terracotta bg-terracotta-10 shadow-sm'
              : 'border-charcoal/10 bg-cream hover:border-charcoal/20'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="COD"
            checked={paymentMethod === 'COD'}
            onChange={() => onPaymentMethodChange('COD')}
            className="accent-terracotta"
          />
          <div>
            <span className="font-semibold text-charcoal text-sm flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-sage" /> Cash on Delivery
            </span>
            <span className="mt-0.5 block text-xs text-charcoal-70">Pay cash when food is delivered</span>
          </div>
        </label>
      </div>

      {/* STRIPE PATH */}
      {paymentMethod === 'STRIPE' && (
        <div className="mt-6">
          {!clientSecret || !mountedStripe ? (
            <div className="space-y-3">
              <p className="text-xs text-charcoal-70 leading-5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sage shrink-0" />
                <span>Your payment details are protected with bank-grade 256-bit encryption.</span>
              </p>
              <Button onClick={onSubmitCheckout} disabled={submitting} className="w-full gap-2 py-3">
                {submitting ? 'Preparing payment gateway...' : `Proceed to Pay ${currency} ${totalAmount.toLocaleString()}`}
              </Button>
            </div>
          ) : (
            <StripePaymentForm
              clientSecret={clientSecret}
              totalAmount={totalAmount}
              currency={currency}
              onPaymentSuccess={onPaymentSuccess}
              onPaymentFailed={onPaymentFailed}
            />
          )}
        </div>
      )}

      {/* COD PATH */}
      {paymentMethod === 'COD' && (
        <div className="mt-6 space-y-4 rounded-2xl bg-cream-dim/60 p-5 border border-charcoal/10 text-xs text-charcoal-70">
          <div className="flex items-center gap-2 text-charcoal font-semibold text-sm">
            <ShieldCheck className="h-4 w-4 text-terracotta" /> Cash on Delivery Confirmation
          </div>
          <p>
            Please have exact cash of <strong>{currency} {totalAmount.toLocaleString()}</strong> ready when your delivery rider arrives.
          </p>
          <Button onClick={onSubmitCheckout} disabled={submitting} className="w-full py-3">
            {submitting ? 'Placing Order...' : `Place Order (${currency} ${totalAmount.toLocaleString()})`}
          </Button>
        </div>
      )}
    </div>
  )
}
