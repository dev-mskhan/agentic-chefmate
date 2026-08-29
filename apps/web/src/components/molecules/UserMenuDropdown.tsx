import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Heart,
  LogOut,
  Package,
  RefreshCw,
  SlidersHorizontal,
  User,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { Avatar } from '../atoms/Avatar'
import type { AuthUser } from '../../lib/auth'

interface UserMenuDropdownProps {
  user: AuthUser
  onLogout: () => void
  unreadNotificationsCount?: number
}

export function UserMenuDropdown({
  user,
  onLogout,
  unreadNotificationsCount = 2,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSignOut = () => {
    setOpen(false)
    onLogout()
    navigate('/')
  }

  const nameToDisplay = user.displayName || user.email
  const shortName = user.firstName || (user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id="user-menu-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-pill border border-charcoal/10 bg-cream p-1 pr-3 text-left transition-colors hover:border-terracotta/40 hover:bg-cream-dim focus-visible:outline-2 focus-visible:outline-terracotta"
      >
        <Avatar
          size="sm"
          src={user.profileImage}
          name={nameToDisplay}
          alt={nameToDisplay}
        />
        <div className="hidden text-left sm:block">
          <span className="block text-xs font-bold leading-tight text-charcoal truncate max-w-[120px]">
            {shortName}
          </span>
          <span className="block text-[10px] text-charcoal-70 leading-tight uppercase font-medium tracking-wider">
            {user.role === 'CHEF' ? 'Chef' : user.role === 'ADMIN' ? 'Admin' : 'Customer'}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-charcoal-70 transition-transform duration-200 ${open ? 'rotate-180 text-terracotta' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-charcoal/10 bg-cream p-2 shadow-xl backdrop-blur-lg z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User info banner */}
          <div className="border-b border-charcoal/10 px-3 py-2.5 mb-1">
            <p className="text-xs font-bold text-charcoal truncate">{nameToDisplay}</p>
            <p className="text-[11px] text-charcoal-70 truncate mt-0.5">{user.email}</p>
            {user.role === 'CHEF' && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-terracotta-10 px-2 py-0.5 text-[10px] font-semibold text-terracotta">
                <Sparkles size={10} /> Active Chef Partner
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5 text-xs font-medium text-charcoal">
            <Link
              to="/orders"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Package size={16} className="text-terracotta" />
                My Orders
              </span>
            </Link>

            <Link
              to="/subscriptions"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <RefreshCw size={16} className="text-terracotta" />
                Meal Subscriptions
              </span>
            </Link>

            <Link
              to="/favorites"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Heart size={16} className="text-terracotta" />
                Saved Kitchens & Dishes
              </span>
            </Link>

            <Link
              to="/notifications"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Bell size={16} className="text-terracotta" />
                Notifications
              </span>
              {unreadNotificationsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-terracotta px-1.5 text-[10px] font-bold text-cream">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-charcoal-70 hover:bg-cream-dim hover:text-charcoal transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <SlidersHorizontal size={16} className="text-terracotta" />
                Profile & Food Preferences
              </span>
            </Link>
          </div>

          {/* Role specific quick-switch link */}
          {user.role === 'CHEF' && (
            <div className="border-t border-charcoal/10 pt-1 mt-1">
              <Link
                to="/chef"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-terracotta hover:bg-terracotta-10 transition-colors"
              >
                <User size={16} />
                Switch to Chef Workspace
              </Link>
            </div>
          )}

          {/* Logout Action */}
          <div className="border-t border-charcoal/10 pt-1 mt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal-70 hover:bg-terracotta-10 hover:text-terracotta-dark transition-colors text-left"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
