import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { getChefById, getDishById, type ChefRecord, type DishRecord } from '../services/api/publicCatalog'
import { readCart, writeCart, type LocalCart } from '../services/cart'

export function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<LocalCart | null>(() => readCart())
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [dishes, setDishes] = useState<DishRecord[]>([])
  const loading = Boolean(cart && chef?.id !== cart.chefId)
  useEffect(() => {
    const refresh = () => setCart(readCart())
    window.addEventListener('chefmate-cart-updated', refresh)
    return () => window.removeEventListener('chefmate-cart-updated', refresh)
  }, [])
  useEffect(() => {
    if (!cart) return
    Promise.all([getChefById(cart.chefId), Promise.all(cart.items.map((item) => getDishById(item.dishId)))])
      .then(([chefValue, dishValues]) => { setChef(chefValue); setDishes(dishValues.filter((dish): dish is DishRecord => Boolean(dish))) })
  }, [cart])
  const total = cart?.items.reduce((sum, item) => sum + (dishes.find((dish) => dish.id === item.dishId)?.price ?? 0) * item.quantity, 0) ?? 0
  const updateQuantity = (dishId: string, quantity: number) => {
    if (!cart) return
    const next = { ...cart, items: cart.items.map((item) => item.dishId === dishId ? { ...item, quantity } : item).filter((item) => item.quantity > 0) }
    writeCart(next.items.length ? next : null)
    setCart(next.items.length ? next : null)
  }
  return <PublicShell navigation={[{ label: 'Discover', href: '/discover' }, { label: 'Chefs', href: '/discover?type=chefs' }, { label: 'Dishes', href: '/discover?type=dishes' }, { label: 'Meal plans', href: '/discover?type=meal-plans' }]}><PageContainer className="py-10 sm:py-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Your order</p><h1 className="mt-4 font-display text-5xl tracking-[-0.035em]">Cart</h1></div><Link to="/discover" className="text-sm font-semibold text-terracotta hover:text-terracotta-dark">Continue browsing</Link></div>{loading && <div className="mt-10 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /> </div>}{!loading && !cart && <div className="mt-10"><EmptyState title="Your cart is empty" description="Choose a dish from a chef to start an order." action={<Link to="/discover?type=dishes" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse dishes</Link>} /></div>}{!loading && cart && chef && <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]"><section><div className="rounded-2xl bg-cream-dim p-5"><p className="text-sm text-charcoal-70">Chef</p><Link to={`/chefs/${chef.id}`} className="mt-1 inline-block font-display text-2xl hover:text-terracotta">{chef.displayName}</Link></div><div className="mt-5 divide-y divide-charcoal/10 rounded-2xl bg-cream">{cart.items.map((item) => { const dish = dishes.find((entry) => entry.id === item.dishId); if (!dish) return null; return <article key={item.dishId} className="flex items-center justify-between gap-4 p-5"><div><Link to={`/dishes/${dish.id}`} className="font-semibold hover:text-terracotta">{dish.name}</Link><p className="mt-1 text-sm text-charcoal-70">{dish.currency} {dish.price.toLocaleString()} each</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => updateQuantity(item.dishId, item.quantity - 1)} aria-label={`Remove one ${dish.name}`} className="h-9 w-9 rounded-full border border-charcoal/15 text-lg focus-visible:outline-2 focus-visible:outline-terracotta">−</button><span className="w-5 text-center text-sm tabular-nums">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.dishId, item.quantity + 1)} aria-label={`Add one ${dish.name}`} className="h-9 w-9 rounded-full border border-charcoal/15 text-lg focus-visible:outline-2 focus-visible:outline-terracotta">+</button></div></article> })}</div></section><aside className="h-fit rounded-2xl bg-espresso p-6 text-cream"><h2 className="font-display text-3xl">Order total</h2><div className="mt-6 flex justify-between text-sm text-cream/70"><span>Subtotal</span><span>PKR {total.toLocaleString()}</span></div><div className="mt-3 flex justify-between border-t border-cream/15 pt-4 font-semibold"><span>Total before delivery</span><span>PKR {total.toLocaleString()}</span></div><p className="mt-4 text-xs leading-5 text-cream/60">Delivery fee and any coupon discount appear at checkout.</p><Button className="mt-6 w-full" onClick={() => navigate('/checkout')}>Continue to checkout</Button></aside></div>}</PageContainer></PublicShell>
}
