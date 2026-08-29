import {
  Heart,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  ShoppingBasket,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../atoms/Button'
import { UserMenuDropdown } from '../molecules/UserMenuDropdown'
import { useAuth } from '../../hooks/useAuth'
import { isReducedMotion } from '../../hooks/useScrollTriggerCleanup'

gsap.registerPlugin(ScrollTrigger)

export function StickyNav({
  navigation,
}: {
  navigation?: readonly { label: string; href: string }[]
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const isLanding = location.pathname === '/'

  // Frosted glass ScrollTrigger transition per DESIGN.md §3.6
  useEffect(() => {
    if (!headerRef.current || !isLanding || isReducedMotion()) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: 'body',
        start: '80px top',
        onEnter: () =>
          gsap.to(headerRef.current, {
            backgroundColor: 'rgba(251,244,234,0.92)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 1px 3px rgba(33,28,23,0.08)',
            borderBottomColor: 'rgba(33,28,23,0.08)',
            duration: 0.3,
            ease: 'power2.out',
          }),
        onLeaveBack: () =>
          gsap.to(headerRef.current, {
            backgroundColor: 'rgba(251,244,234,0)',
            backdropFilter: 'blur(0px)',
            boxShadow: 'none',
            borderBottomColor: 'rgba(33,28,23,0)',
            duration: 0.3,
            ease: 'power2.out',
          }),
      })
    }, headerRef)

    return () => ctx.revert()
  }, [isLanding])

  const defaultLinks = [
    { label: 'Discover', href: '/discover' },
    { label: 'Chefs', href: '/discover?type=chefs' },
    { label: 'Dishes', href: '/discover?type=dishes' },
    { label: 'Meal plans', href: '/discover?type=meal-plans' },
  ]

  const links = (navigation ?? defaultLinks).filter((link) => link.href !== '/cart')

  const handleMobileSignOut = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 transition-colors ${isLanding ? 'bg-transparent border-b border-transparent' : 'border-b border-charcoal/10 bg-cream/90 backdrop-blur-md'}`}
    >
      <nav
        className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3.5 sm:px-8 lg:px-12 2xl:px-16"
        aria-label="Primary"
      >
        {/* Brand Wordmark */}
        <Link to="/" className="font-display text-2xl tracking-tight text-charcoal">
          chefmate<span className="text-terracotta">.</span>
        </Link>

        {/* Center Primary Nav Links */}
        <div className="hidden items-center gap-7 text-sm font-medium text-charcoal-70 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="transition-colors hover:text-terracotta"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/chef/onboarding"
            className="transition-colors text-terracotta font-semibold hover:text-terracotta-dark"
          >
            Cook with us
          </Link>
        </div>

        {/* Right Actions Cluster */}
        <div className="flex items-center gap-2.5">
          {/* Basket Link */}
          <Link
            to="/cart"
            aria-label="Basket"
            title="Basket"
            className="inline-flex min-h-10 items-center gap-2 rounded-pill px-3.5 text-xs font-semibold text-charcoal-70 transition-colors hover:bg-cream-dim hover:text-charcoal focus-visible:outline-2 focus-visible:outline-terracotta"
          >
            <ShoppingBasket size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Basket</span>
          </Link>

          {/* Conditional Identity Gate: User Profile vs Sign In */}
          {isAuthenticated && user ? (
            <UserMenuDropdown user={user} onLogout={logout} />
          ) : (
            <Link
              to="/signin"
              className="inline-flex min-h-10 items-center rounded-pill px-4 py-2 text-xs font-semibold text-charcoal-70 transition-colors hover:bg-cream-dim hover:text-charcoal focus-visible:outline-2 focus-visible:outline-terracotta"
            >
              Sign in
            </Link>
          )}

          {/* Primary Discovery CTA */}
          <Button
            className="py-2.5 px-4 text-xs font-semibold"
            onClick={() => navigate('/discover?type=chefs')}
          >
            Find a chef
          </Button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal md:hidden focus-visible:outline-2 focus-visible:outline-terracotta"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Responsive Mobile Drawer */}
      {menuOpen && (
        <div className="border-t border-charcoal/10 bg-cream px-4 py-4 md:hidden animate-in slide-in-from-top duration-200 shadow-xl">
          {isAuthenticated && user && (
            <div className="mb-4 rounded-2xl bg-cream-dim p-3 border border-charcoal/10">
              <div className="flex items-center gap-3">
                <img
                  src={user.profileImage}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full object-cover border border-charcoal/10"
                />
                <div>
                  <p className="text-xs font-bold text-charcoal">{user.displayName}</p>
                  <p className="text-[11px] text-charcoal-70">{user.email}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                <Link
                  to="/orders"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10"
                >
                  <Package size={14} className="text-terracotta" /> Orders
                </Link>
                <Link
                  to="/subscriptions"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10"
                >
                  <RefreshCw size={14} className="text-terracotta" /> Plans
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10"
                >
                  <Heart size={14} className="text-terracotta" /> Saved
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10"
                >
                  <SlidersHorizontal size={14} className="text-terracotta" /> Profile
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal-70 hover:bg-cream-dim hover:text-charcoal"
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/chef/onboarding"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-terracotta-10 px-3 py-2.5 text-sm font-bold text-terracotta hover:bg-terracotta-10/80 border border-terracotta/20 flex items-center justify-between my-1"
            >
              <span>Cook with ChefMate</span>
              <span className="text-[10px] uppercase font-bold bg-terracotta text-cream px-2 py-0.5 rounded-pill">
                Join
              </span>
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleMobileSignOut}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-terracotta hover:bg-terracotta-10 text-left mt-2"
              >
                <LogOut size={16} /> Sign Out
              </button>
            ) : (
              <Link
                to="/signin"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-terracotta hover:bg-terracotta-10"
              >
                Sign in to your account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
