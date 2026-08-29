import {
  Heart,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserMenuDropdown } from '../molecules/UserMenuDropdown'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../services/api/chatService'

export function StickyNav({
  navigation,
}: {
  navigation?: readonly { label: string; href: string }[]
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Fetch unread messages for logged in user
  useEffect(() => {
    if (isAuthenticated) {
      getUnreadCount(user?.role === 'CHEF' ? 'CHEF' : 'USER')
        .then((res) => setUnreadMessages(res.unreadCount))
        .catch(() => {})
    }
  }, [isAuthenticated, user?.role])

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!navSearchQuery.trim()) return
    navigate(`/discover?q=${encodeURIComponent(navSearchQuery.trim())}`)
  }

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
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-charcoal/10 shadow-2xs">
      {/* ── 1. Top Utility Strip (Double Nav: Clean, quiet secondary links) ── */}
      <div className="border-b border-charcoal/6 bg-cream-dim/70 px-4 py-1.5 sm:px-8 lg:px-12 2xl:px-16 hidden md:block text-[11px] text-charcoal-70">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          {/* Left: Location & Quality Badge */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-charcoal">📍 Verified Kitchens:</span>
            <span>Lahore · Karachi · Islamabad · Rawalpindi</span>
            <span className="text-charcoal/20">|</span>
            <span className="text-sage font-bold">100% Food Safety Inspected</span>
          </div>

          {/* Right: Utility & Onboarding Links */}
          <div className="flex items-center gap-5">
            <Link
              to="/chef/onboarding"
              className="font-bold text-terracotta hover:text-terracotta-dark transition-colors"
            >
              Cook on ChefMate →
            </Link>
            <Link to="/about" className="hover:text-charcoal transition-colors">
              Our Story
            </Link>
            <Link to="/faq" className="hover:text-charcoal transition-colors">
              Help & FAQs
            </Link>
            <Link to="/contact" className="hover:text-charcoal transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Main Navigation Bar (Spacious, prominent, uncluttered) ── */}
      <div className="px-4 py-3 sm:px-8 lg:px-12 2xl:px-16">
        <nav
          className="mx-auto flex max-w-[1500px] items-center justify-between gap-6"
          aria-label="Primary"
        >
          {/* Left: Brand Wordmark */}
          <Link
            to="/"
            className="font-display text-2xl sm:text-3xl tracking-tight text-charcoal shrink-0"
          >
            chefmate<span className="text-terracotta">.</span>
          </Link>

          {/* Center-Left: Primary Marketplace Category Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-charcoal-70">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="transition-colors hover:text-terracotta"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Center-Right: Quick Search Pill Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center flex-1 max-w-sm relative ml-auto mr-2"
          >
            <div className="w-full flex items-center gap-2 rounded-pill bg-cream-dim/80 px-3.5 py-2 border border-charcoal/10 hover:border-terracotta/40 focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 focus-within:bg-cream transition-all">
              <Search size={14} className="text-charcoal-70 shrink-0" />
              <input
                type="text"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Search dishes or local chefs..."
                className="w-full bg-transparent text-xs text-charcoal placeholder:text-charcoal-70/60 outline-none"
              />
              {navSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNavSearchQuery('')}
                  className="text-charcoal-70 hover:text-charcoal text-xs p-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Messages (Authenticated) */}
            {isAuthenticated && (
              <Link
                to={user?.role === 'CHEF' ? '/chef/messages' : '/messages'}
                aria-label="Messages"
                title="Messages"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
              >
                <MessageSquare size={17} />
                {unreadMessages > 0 && (
                  <span className="absolute 0 top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-cream">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            )}

            {/* Shopping Basket */}
            <Link
              to="/cart"
              aria-label="Basket"
              title="Basket"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-cream-dim px-3.5 py-1.5 text-xs font-bold text-charcoal border border-charcoal/10 hover:border-terracotta/30 transition-colors"
            >
              <ShoppingBasket size={15} className="text-terracotta" />
              <span>Basket</span>
            </Link>

            {/* Auth Button or User Menu */}
            {isAuthenticated && user ? (
              <UserMenuDropdown user={user} onLogout={logout} />
            ) : (
              <Link
                to="/signin"
                className="inline-flex min-h-9 items-center rounded-pill px-3.5 py-1.5 text-xs font-bold text-charcoal-70 hover:text-charcoal hover:bg-cream-dim transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Mobile Hamburger Drawer Toggle */}
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal md:hidden hover:bg-cream-dim transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer (Clean & Organized) */}
      {menuOpen && (
        <div className="border-t border-charcoal/10 bg-cream px-4 py-4 md:hidden animate-in slide-in-from-top duration-200 shadow-xl space-y-4">
          {/* Mobile Search */}
          <form
            onSubmit={(e) => {
              handleSearchSubmit(e)
              setMenuOpen(false)
            }}
            className="flex items-center gap-2 rounded-2xl bg-cream-dim px-3.5 py-2 border border-charcoal/10"
          >
            <Search size={15} className="text-terracotta shrink-0" />
            <input
              type="text"
              value={navSearchQuery}
              onChange={(e) => setNavSearchQuery(e.target.value)}
              placeholder="Search dishes or chefs..."
              className="w-full bg-transparent text-xs text-charcoal outline-none placeholder:text-charcoal-70/60"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-pill bg-terracotta text-cream text-xs font-bold shrink-0"
            >
              Go
            </button>
          </form>

          {/* User Profile Bar (If Logged In) */}
          {isAuthenticated && user && (
            <div className="rounded-2xl bg-cream-dim p-3 border border-charcoal/10">
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
                  to={user.role === 'CHEF' ? '/chef/messages' : '/messages'}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10"
                >
                  <MessageSquare size={14} className="text-terracotta" /> Messages
                  {unreadMessages > 0 && (
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-cream">
                      {unreadMessages}
                    </span>
                  )}
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
                  className="flex items-center gap-1.5 rounded-xl bg-cream p-2 text-charcoal border border-charcoal/10 col-span-2"
                >
                  <SlidersHorizontal size={14} className="text-terracotta" /> Profile & Settings
                </Link>
              </div>
            </div>
          )}

          {/* Primary Nav Links */}
          <div className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-charcoal-70 hover:bg-cream-dim hover:text-charcoal"
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
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-terracotta hover:bg-terracotta-10 text-left mt-2"
              >
                <LogOut size={15} /> Sign Out
              </button>
            ) : (
              <Link
                to="/signin"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-terracotta hover:bg-terracotta-10"
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
