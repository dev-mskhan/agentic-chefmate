import { Menu, ShoppingBasket, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../atoms/Button'

export function StickyNav({ navigation }: { navigation?: readonly { label: string; href: string }[] }) {
  const allLinks = navigation ?? [
    { label: 'Discover', href: '/discover' },
    { label: 'Chefs', href: '/discover?type=chefs' },
    { label: 'Dishes', href: '/discover?type=dishes' },
    { label: 'Meal plans', href: '/discover?type=meal-plans' },
  ]
  const links = allLinks.filter((link) => link.href !== '/cart')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-cream/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8 lg:px-12 2xl:px-16" aria-label="Primary">
        <Link to="/" className="font-display text-2xl tracking-tight text-charcoal">
          chefmate<span className="text-terracotta">.</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-charcoal-70 md:flex">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="transition-colors hover:text-terracotta">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cart" aria-label="Basket" title="Basket" className="inline-flex min-h-10 items-center gap-2 rounded-pill px-3 text-sm font-semibold text-charcoal-70 transition-colors hover:bg-cream-dim hover:text-charcoal focus-visible:outline-2 focus-visible:outline-terracotta">
            <ShoppingBasket size={19} aria-hidden="true" />
            <span className="hidden sm:inline">Basket</span>
          </Link>
          <Link to="/auth/sign-in" className="inline-flex rounded-pill px-3 py-2 text-sm font-semibold text-charcoal-70 transition-colors hover:bg-cream-dim hover:text-charcoal sm:px-4">Sign in</Link>
          <Button onClick={() => window.location.assign('/discover?type=chefs')}>Find a chef</Button>
          <button type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal md:hidden focus-visible:outline-2 focus-visible:outline-terracotta">
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      {menuOpen && <div className="border-t border-charcoal/10 bg-cream px-4 py-3 md:hidden"><div className="grid gap-1">{links.map((link) => <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-charcoal-70 hover:bg-cream-dim hover:text-charcoal">{link.label}</Link>)}</div></div>}
    </header>
  )
}
