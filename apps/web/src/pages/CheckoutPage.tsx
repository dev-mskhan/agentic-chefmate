import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Input } from '../components/atoms/Input'
import { Skeleton } from '../components/atoms/Skeleton'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { checkoutPreview, getChefById, listAddresses, submitCheckout, type AddressRecord, type CheckoutPreview } from '../services/api/publicCatalog'
import { readCart, toCheckoutInput } from '../services/cart'

export function CheckoutPage() {
  const navigate = useNavigate()
  const cart = readCart()
  const [addresses, setAddresses] = useState<AddressRecord[]>([])
  const [date, setDate] = useState('2026-08-29')
  const [addressId, setAddressId] = useState('')
  const [coupon, setCoupon] = useState('')
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [chefName, setChefName] = useState('')
  useEffect(() => {
    if (!cart) return
    Promise.all([listAddresses(), getChefById(cart.chefId)]).then(([addressRows, chef]) => { setAddresses(addressRows); setAddressId(addressRows.find((address) => address.isDefault)?.id ?? addressRows[0]?.id ?? ''); setChefName(chef?.displayName ?? '') })
  }, [cart])
  if (!cart) return <PublicShell><PageContainer><EmptyState title="Your cart is empty" description="Choose a dish before checkout." action={<Link to="/discover?type=dishes" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse dishes</Link>} /></PageContainer></PublicShell>
  const input = toCheckoutInput(cart, date, addressId, coupon)
  const refreshPreview = () => {
    setLoading(true); setError('')
    checkoutPreview(input).then(setPreview).catch((reason: Error) => { setPreview(null); setError(reason.message) }).finally(() => setLoading(false))
  }
  const submit = () => {
    if (!preview || !addressId) { setError('Choose an address and review the order before payment.'); return }
    setSubmitting(true)
    const idempotencyKey = `checkout-${cart.chefId}-${date}-${addressId}`
    submitCheckout(input, idempotencyKey).then((result) => {
      navigate(`/checkout/confirmation?key=${encodeURIComponent(idempotencyKey)}`, { state: { result } })
    }).catch((reason: Error) => setError(reason.message)).finally(() => setSubmitting(false))
  }
  return <PublicShell navigation={[{ label: 'Discover', href: '/discover' }, { label: 'Cart', href: '/cart' }]}><PageContainer className="py-10 sm:py-16"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Order with {chefName}</p><h1 className="mt-4 font-display text-5xl tracking-[-0.035em]">Checkout</h1><p className="mt-5 max-w-xl text-lg leading-8 text-charcoal-70">Choose a delivery date and address. Review the price before payment.</p></div><div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]"><section className="grid gap-6"><label className="grid gap-2 text-sm font-medium">Delivery date<input type="date" value={date} min="2026-08-26" onChange={(event) => { setDate(event.target.value); setPreview(null) }} className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-4 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label><fieldset className="grid gap-3"><legend className="text-sm font-medium">Delivery address</legend>{addresses.map((address) => <label key={address.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${addressId === address.id ? 'border-terracotta bg-terracotta-10' : 'border-charcoal/10 bg-cream'}`}><input type="radio" name="address" value={address.id} checked={addressId === address.id} onChange={() => { setAddressId(address.id); setPreview(null) }} className="mt-1 accent-terracotta" /><span><span className="block font-semibold">{address.label}</span><span className="mt-1 block text-sm leading-6 text-charcoal-70">{address.line1}, {address.area}, {address.city} {address.postalCode}</span></span></label>)}</fieldset><div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><Input id="coupon" label="Coupon code" value={coupon} onChange={(event) => { setCoupon(event.target.value.toUpperCase()); setPreview(null) }} placeholder="Enter coupon code" /><Button variant="secondary" onClick={refreshPreview}>Review price</Button></div>{error && <div role="alert" className="rounded-xl bg-rust/10 p-4 text-sm text-rust">{error}</div>}<div className="rounded-2xl bg-cream-dim p-5 text-sm leading-6 text-charcoal-70"><strong className="text-charcoal">Payment</strong><p className="mt-1">Payment details open securely after you confirm this order.</p><p className="mt-2">This preview uses one idempotency key so a repeated submission does not create a second order.</p></div></section><aside className="h-fit rounded-2xl bg-espresso p-6 text-cream"><h2 className="font-display text-3xl">Price preview</h2>{loading && <div className="mt-6 space-y-3"><Skeleton className="h-5 bg-cream/20" /><Skeleton className="h-5 bg-cream/20" /><Skeleton className="h-8 bg-cream/20" /></div>}{!loading && !preview && <p className="mt-5 text-sm leading-6 text-cream/65">Review the price after selecting your details.</p>}{preview && <div className="mt-6 space-y-3 text-sm"><div className="flex justify-between text-cream/70"><span>Subtotal</span><span>{preview.currency} {preview.subtotal.toLocaleString()}</span></div><div className="flex justify-between text-cream/70"><span>Delivery</span><span>{preview.currency} {preview.deliveryFee.toLocaleString()}</span></div>{preview.discountAmount > 0 && <div className="flex justify-between text-saffron"><span>Discount</span><span>− {preview.currency} {preview.discountAmount.toLocaleString()}</span></div>}<div className="flex justify-between border-t border-cream/15 pt-4 text-lg font-semibold"><span>Total</span><span>{preview.currency} {preview.total.toLocaleString()}</span></div><Button className="mt-4 w-full" disabled={submitting} onClick={submit}>{submitting ? 'Confirming order' : 'Confirm order'}</Button></div>}</aside></div></PageContainer></PublicShell>
}

export function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = (location.state as { result?: { order: { id: string }; paymentId: string } } | null)?.result
  const key = new URLSearchParams(window.location.search).get('key') ?? 'checkout-confirmation'
  const orderId = result?.order.id ?? `order-${key.slice(-8)}`
  useEffect(() => {
    window.localStorage.removeItem('chefmate-cart')
    window.dispatchEvent(new Event('chefmate-cart-updated'))
  }, [])
  return <PublicShell navigation={[{ label: 'Discover', href: '/discover' }]}><PageContainer className="py-16 sm:py-24"><div className="mx-auto max-w-2xl rounded-[2rem] bg-espresso p-8 text-cream sm:p-12"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage text-2xl" aria-hidden="true">✓</span><p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-saffron">Order confirmed</p><h1 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.035em]">Your order is ready for the chef.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-cream/70">Your order is recorded. Payment can continue in the secure provider window.</p><dl className="mt-8 grid gap-3 border-t border-cream/15 pt-6 text-sm"><div className="flex justify-between gap-4"><dt className="text-cream/60">Order number</dt><dd className="font-semibold">{orderId}</dd></div><div className="flex justify-between gap-4"><dt className="text-cream/60">Payment</dt><dd className="font-semibold">Ready to complete</dd></div></dl><Button className="mt-8" onClick={() => navigate('/discover')}>Browse more food</Button></div></PageContainer></PublicShell>
}
