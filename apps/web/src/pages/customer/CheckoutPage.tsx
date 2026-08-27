import { useState } from 'react'
import { ShoppingBasket, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/atoms/Button'
import { EmptyState } from '../../components/atoms/EmptyState'
import { PageContainer } from '../../components/templates/PageContainer'
import { PublicShell } from '../../components/templates/PublicShell'

import { AddressStep } from '../../features/checkout/components/AddressStep'
import { CheckoutEdgeCaseControls } from '../../features/checkout/components/CheckoutEdgeCaseControls'
import { CouponSection } from '../../features/checkout/components/CouponSection'
import { DeliveryDateStep } from '../../features/checkout/components/DeliveryDateStep'
import { InlineAuthPanel } from '../../features/checkout/components/InlineAuthPanel'
import { OrderPreviewPanel } from '../../features/checkout/components/OrderPreviewPanel'
import { PaymentMethodStep } from '../../features/checkout/components/PaymentMethodStep'

import { useCheckout } from '../../features/checkout/hooks/useCheckout'
import { CHEFS_DB } from '../../lib/api/checkout'

export function CheckoutPage() {
  const navigate = useNavigate()
  const {
    user,
    setUser,
    checkoutState,
    dateValid,
    previewLoading,
    submitError,
    setSubmitError,
    submitting,
    clientSecret,
    setDate,
    setAddress,
    setCoupon,
    setPaymentMethod,
    removeDishItem,
    injectInactiveDish,
    injectDifferentChefDish,
    injectMixedCurrencyDish,
    triggerSessionExpiry,
    simulatePaymentFailure,
    setSimulatePaymentFailure,
    submitOrder,
  } = useCheckout()

  const [addressMissingSimulated, setAddressMissingSimulated] = useState(false)

  const chefName = CHEFS_DB[checkoutState.chefId]?.displayName || 'Chef Ayesha Khan'

  // Empty cart check
  if (!checkoutState.items || checkoutState.items.length === 0) {
    return (
      <PublicShell navigation={[{ label: 'Discover', href: '/discover' }]}>
        <PageContainer className="py-16 sm:py-24">
          <EmptyState
            icon={ShoppingBasket}
            title="Your food basket is empty"
            description="Explore home chefs and add dishes to your basket before starting checkout."
            action={
              <Link
                to="/discover?type=dishes"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-6 text-sm font-semibold text-cream hover:bg-terracotta-dark"
              >
                Browse home dishes
              </Link>
            }
          />
        </PageContainer>
      </PublicShell>
    )
  }

  const isReadyForPayment = Boolean(user && checkoutState.deliveryDate && dateValid && checkoutState.addressId && !addressMissingSimulated)

  const handleCheckoutSubmit = async () => {
    if (addressMissingSimulated) {
      setSubmitError('Selected address is no longer available. Please choose or add a delivery address.')
      return
    }
    const res = await submitOrder()
    if (res && checkoutState.paymentMethod === 'COD') {
      navigate(`/orders/${res.orderId}`, { state: { paymentMethod: 'COD' } })
    }
  }

  const handleStripePaymentSuccess = () => {
    if (clientSecret) {
      const orderId = clientSecret.replace('pi_sec_', '')
      navigate(`/orders/${orderId}`, { state: { paymentMethod: 'STRIPE' } })
    }
  }

  const handleStripePaymentFailed = (errMsg: string) => {
    setSubmitError(errMsg)
  }

  return (
    <PublicShell
      navigation={[
        { label: 'Discover', href: '/discover' },
        { label: 'Basket', href: '/cart' },
      ]}
    >
      <PageContainer className="py-10 sm:py-16">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
              Order with {chefName}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl tracking-[-0.03em] text-charcoal">
              Complete Your Order
            </h1>
            <p className="mt-2 max-w-xl text-base text-charcoal-70">
              Verify your details, select delivery date and address, and review pricing before payment.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-3 rounded-2xl bg-cream-dim p-3 px-4 border border-charcoal/10 text-xs">
              <ShieldCheck className="h-4 w-4 text-sage" />
              <div>
                <span className="font-semibold text-charcoal block">Signed in as {user.displayName || user.email}</span>
                <span className="text-charcoal-70">Cart preserved</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div role="alert" className="mt-6 flex items-center justify-between rounded-2xl bg-rust/10 p-4 text-xs font-semibold text-rust border border-rust/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{submitError}</span>
            </div>
            <button type="button" onClick={() => setSubmitError('')} className="underline text-rust/80 hover:text-rust">
              Dismiss
            </button>
          </div>
        )}

        {/* Checkout Main Flow Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Steps Column */}
          <main className="space-y-6">
            {!user ? (
              <InlineAuthPanel onAuthenticated={(loggedInUser) => setUser(loggedInUser)} />
            ) : (
              <>
                <DeliveryDateStep
                  chefId={checkoutState.chefId}
                  selectedDate={checkoutState.deliveryDate}
                  onDateSelect={setDate}
                />

                {addressMissingSimulated ? (
                  <div className="rounded-2xl border border-rust/30 bg-rust/10 p-6 text-xs text-rust font-medium">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Selected address is no longer available</span>
                      <Button
                        variant="secondary"
                        className="text-xs py-1 px-3"
                        onClick={() => {
                          setAddressMissingSimulated(false)
                          setSubmitError('')
                        }}
                      >
                        Reset address selection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <AddressStep
                    user={user}
                    selectedAddressId={checkoutState.addressId}
                    onAddressSelect={setAddress}
                  />
                )}

                <CouponSection
                  chefId={checkoutState.chefId}
                  appliedCoupon={checkoutState.couponCode}
                  onApplyCoupon={setCoupon}
                />

                <PaymentMethodStep
                  paymentMethod={checkoutState.paymentMethod || 'STRIPE'}
                  onPaymentMethodChange={setPaymentMethod}
                  idempotencyKey={checkoutState.idempotencyKey}
                  totalAmount={checkoutState.preview?.total || 0}
                  currency={checkoutState.preview?.currency || 'PKR'}
                  clientSecret={clientSecret}
                  submitting={submitting}
                  onSubmitCheckout={handleCheckoutSubmit}
                  onPaymentSuccess={handleStripePaymentSuccess}
                  onPaymentFailed={handleStripePaymentFailed}
                  disabled={!isReadyForPayment}
                />
              </>
            )}
          </main>

          {/* Right Column: Order Preview Panel */}
          <div>
            <div className="sticky top-24">
              <OrderPreviewPanel
                chefName={chefName}
                items={checkoutState.items}
                preview={checkoutState.preview}
                loading={previewLoading}
                error={submitError}
                onRemoveInvalidDish={removeDishItem}
              />
            </div>
          </div>
        </div>

        {/* Dev / Reviewer Edge Case Controls Bar */}
        <CheckoutEdgeCaseControls
          onAddInactiveDish={injectInactiveDish}
          onAddDifferentChefDish={injectDifferentChefDish}
          onAddMixedCurrencyDish={injectMixedCurrencyDish}
          onTriggerChefUnavailable={() => setDate('2026-08-31', false)}
          onTriggerAddressMissing={() => setAddressMissingSimulated(true)}
          onTriggerSessionExpiry={triggerSessionExpiry}
          onTriggerPaymentSubmitFailure={() => setSimulatePaymentFailure(!simulatePaymentFailure)}
        />
      </PageContainer>
    </PublicShell>
  )
}
