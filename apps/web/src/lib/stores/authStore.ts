import { create } from 'zustand'
import {
  getCurrentUser,
  loginFixtureUser,
  logoutUser,
  setCurrentUser,
  type AuthUser,
} from '../auth'

interface AuthStoreState {
  user: AuthUser | null
  isAuthenticated: boolean
  role: 'USER' | 'CHEF' | 'ADMIN' | null
  login: (role?: 'USER' | 'CHEF' | 'ADMIN') => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  switchRole: (role: 'USER' | 'CHEF' | 'ADMIN') => void
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: getCurrentUser(),
  isAuthenticated: Boolean(getCurrentUser()),
  role: getCurrentUser()?.role ?? null,
  login: (role = 'USER') => {
    loginFixtureUser(role)
    const current = getCurrentUser()
    set({ user: current, isAuthenticated: Boolean(current), role: current?.role ?? null })
  },
  logout: () => {
    logoutUser()
    set({ user: null, isAuthenticated: false, role: null })
  },
  setUser: (user) => {
    setCurrentUser(user)
    set({ user, isAuthenticated: Boolean(user), role: user?.role ?? null })
  },
  switchRole: (role) => {
    loginFixtureUser(role)
    const current = getCurrentUser()
    set({ user: current, isAuthenticated: Boolean(current), role: current?.role ?? null })
  },
}))
