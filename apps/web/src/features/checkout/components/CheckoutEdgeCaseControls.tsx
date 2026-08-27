import { useState } from 'react'
import { Sliders, AlertOctagon } from 'lucide-react'

interface CheckoutEdgeCaseControlsProps {
  onAddInactiveDish: () => void
  onAddDifferentChefDish: () => void
  onAddMixedCurrencyDish: () => void
  onTriggerChefUnavailable: () => void
  onTriggerAddressMissing: () => void
  onTriggerSessionExpiry: () => void
  onTriggerPaymentSubmitFailure: () => void
}

export function CheckoutEdgeCaseControls({
  onAddInactiveDish,
  onAddDifferentChefDish,
  onAddMixedCurrencyDish,
  onTriggerChefUnavailable,
  onTriggerAddressMissing,
  onTriggerSessionExpiry,
  onTriggerPaymentSubmitFailure,
}: CheckoutEdgeCaseControlsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-pill bg-espresso px-4 py-2 text-xs font-semibold text-saffron shadow-2xl hover:bg-espresso/90 border border-saffron/30"
      >
        <Sliders className="h-4 w-4" />
        <span>Test Order Scenarios</span>
      </button>

      {open && (
        <div className="mt-2 w-80 rounded-2xl border border-charcoal/20 bg-espresso p-4 text-xs text-cream shadow-2xl space-y-2.5 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-cream/15 pb-2">
            <span className="font-semibold text-saffron flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4" /> Test Edge Cases
            </span>
            <button type="button" onClick={() => setOpen(false)} className="text-cream/50 hover:text-cream">
              ✕
            </button>
          </div>

          <button
            type="button"
            onClick={onAddInactiveDish}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            1. Add Inactive Dish to Basket
          </button>

          <button
            type="button"
            onClick={onAddDifferentChefDish}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            2. Add Dish from Different Chef (Multi-chef conflict)
          </button>

          <button
            type="button"
            onClick={onAddMixedCurrencyDish}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            3. Add Dish with USD Currency (Mixed currency error)
          </button>

          <button
            type="button"
            onClick={onTriggerChefUnavailable}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            4. Set Chef Off-Day Delivery Date (Monday)
          </button>

          <button
            type="button"
            onClick={onTriggerAddressMissing}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            5. Simulate Removed Address
          </button>

          <button
            type="button"
            onClick={onTriggerSessionExpiry}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors"
          >
            6. Expire User Session Mid-Flow
          </button>

          <button
            type="button"
            onClick={onTriggerPaymentSubmitFailure}
            className="w-full text-left rounded-xl bg-cream/10 p-2.5 hover:bg-cream/20 font-medium transition-colors text-rust font-semibold"
          >
            7. Simulate Payment Processing Failure
          </button>
        </div>
      )}
    </div>
  )
}
