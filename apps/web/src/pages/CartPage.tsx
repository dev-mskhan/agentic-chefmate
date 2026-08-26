import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { mockDishes, mockMealPlans } from '../services/mockRepository'
import { PageHeading, PublicPageShell } from './PublicPageShell'

export function CartPage() {
  const [searchParams] = useSearchParams()
  const itemId = searchParams.get('item')
  const dish = mockDishes.find((item) => item.id === itemId)
  const plan = mockMealPlans.find((item) => item.id === itemId)
  const item = dish ?? plan
  const price = item ? ('price' in item ? item.price : item.basePrice) : 0
  return <PublicPageShell><main className="mx-auto max-w-[1100px] px-4 py-14 sm:px-8 lg:px-12 lg:py-24"><PageHeading title="Your table, taking shape." copy="This checkout preview keeps the one-chef cart contract visible while payments and delivery are connected later." /><div className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]"><section className="rounded-[2rem] bg-cream-dim p-6 sm:p-8" aria-labelledby="cart-items"><h2 id="cart-items" className="font-display text-3xl">Cart items</h2>{item ? <div className="mt-6 flex items-center justify-between gap-4 border-t border-charcoal/10 pt-5"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-charcoal-70">{'price' in item ? 'Dish' : `${item.frequency} meal plan`} · quantity 1</p></div><p className="font-semibold">PKR {price.toLocaleString()}</p></div> : <div className="mt-6 border-t border-charcoal/10 pt-5"><p className="text-charcoal-70">Your demo cart is empty.</p><Link to="/discover" className="mt-5 inline-flex font-semibold text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">Browse discovery →</Link></div>}</section><aside className="rounded-[2rem] bg-espresso p-6 text-cream sm:p-8"><h2 className="font-display text-3xl">Checkout preview</h2><div className="mt-6 grid gap-3 border-y border-cream/15 py-5 text-sm"><div className="flex justify-between"><span className="text-cream/65">Subtotal</span><span>PKR {price.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-cream/65">Delivery</span><span>Calculated next</span></div><div className="flex justify-between font-semibold"><span>Total preview</span><span>PKR {price.toLocaleString()}</span></div></div><Button disabled={!item} className="mt-6 min-h-12 w-full">Continue to delivery</Button>{!item && <p className="mt-3 text-xs text-cream/60">Choose a dish or plan before continuing.</p>}</aside></div></main></PublicPageShell>
}
