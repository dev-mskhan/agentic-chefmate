import { ShoppingBag, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Skeleton } from '../../../components/atoms/Skeleton'
import type { CartItem } from '../types'

interface OrderPreviewPanelProps {
  chefName?: string
  items: CartItem[]
  preview?: {
    subtotal: number
    deliveryFee: number
    discountAmount: number
    total: number
    currency: string
    couponCode?: string
    invalidDishIds?: string[]
  }
  loading?: boolean
  error?: string
  onRemoveInvalidDish?: (dishId: string) => void
}

const DISH_NAMES: Record<string, string> = {
  'dish-1': 'Special Chicken Biryani',
  'dish-2': 'Shahi Paneer Butter Masala',
  'dish-3': 'Fresh Tandoori Naan (3 pcs)',
  'dish-99': 'Seasonal Mango Kheer (Unavailable)',
}

export function OrderPreviewPanel({
  chefName = 'Chef Fatima Ahmad',
  items,
  preview,
  loading = false,
  error,
  onRemoveInvalidDish,
}: OrderPreviewPanelProps) {
  const hasInvalidDishes = Boolean(preview?.invalidDishIds && preview.invalidDishIds.length > 0)

  return (
    <aside className="h-fit rounded-[2rem] bg-espresso p-6 text-cream shadow-xl sm:p-8 border border-cream/10">
      <div className="flex items-center justify-between border-b border-cream/15 pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron">Order Summary</span>
          <h2 className="mt-1 font-display text-2xl text-cream">{chefName}</h2>
        </div>
        <ShoppingBag className="h-6 w-6 text-saffron opacity-80" />
      </div>

      {/* Cart Items list preview */}
      <div className="mt-5 space-y-3 border-b border-cream/15 pb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-cream/60">Items in Order ({items.length})</span>
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {items.map((item) => {
            const name = DISH_NAMES[item.dishId] || `Dish ${item.dishId}`
            const isInvalid = preview?.invalidDishIds?.includes(item.dishId)

            return (
              <div key={item.dishId} className={`flex items-center justify-between text-xs ${isInvalid ? 'text-rust' : 'text-cream/80'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-saffron">{item.quantity}x</span>
                  <span className={isInvalid ? 'line-through opacity-80' : ''}>{name}</span>
                </div>
                {isInvalid && onRemoveInvalidDish && (
                  <button
                    type="button"
                    onClick={() => onRemoveInvalidDish(item.dishId)}
                    className="text-[10px] underline text-rust hover:text-rust/80 ml-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edge Case Alert: Inactive Dish */}
      {hasInvalidDishes && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rust/20 p-3.5 text-xs text-cream border border-rust/30">
          <AlertTriangle className="h-4 w-4 text-rust shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rust">Dish unavailable</span>
            <p className="mt-0.5 text-cream/70 text-[11px] leading-4">
              Some items in your cart are no longer active. Please remove them to proceed with checkout preview.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !hasInvalidDishes && (
        <div className="mt-4 rounded-xl bg-rust/20 p-3.5 text-xs text-rust font-medium border border-rust/30">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 bg-cream/10" />
          <Skeleton className="h-4 bg-cream/10" />
          <Skeleton className="h-4 bg-cream/10" />
          <Skeleton className="h-8 bg-cream/20 mt-4" />
        </div>
      )}

      {/* Live calculated pricing breakdown */}
      {!loading && preview && !hasInvalidDishes && (
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between text-cream/70">
            <span>Subtotal</span>
            <span>{preview.currency} {preview.subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-cream/70">
            <span>Delivery Fee</span>
            <span>{preview.currency} {preview.deliveryFee.toLocaleString()}</span>
          </div>

          {preview.discountAmount > 0 && (
            <div className="flex justify-between font-medium text-saffron">
              <span>Promo Discount ({preview.couponCode})</span>
              <span>− {preview.currency} {preview.discountAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-cream/20 pt-4 text-lg font-bold text-cream">
            <span>Total</span>
            <span className="text-saffron font-display text-2xl">
              {preview.currency} {preview.total.toLocaleString()}
            </span>
          </div>

          <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-cream/50">
            <ShieldCheck className="h-3.5 w-3.5 text-sage" />
            <span>Guaranteed price. Calculated live from your order.</span>
          </div>
        </div>
      )}
    </aside>
  )
}
