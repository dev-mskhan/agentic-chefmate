export interface AuthUser {
  id: string
  email: string
  role: 'USER' | 'CHEF' | 'ADMIN'
  displayName?: string
  firstName?: string
  lastName?: string
  profileImage?: string
  phone?: string
}

export const DEFAULT_FIXTURE_USER: AuthUser = {
  id: 'user-tariq-mahmood',
  email: 'tariq.mahmood@example.com',
  displayName: 'Tariq Mahmood',
  firstName: 'Tariq',
  lastName: 'Mahmood',
  role: 'USER',
  phone: '+92-300-5550199',
  profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
}

const AUTH_KEY = 'chefmate-auth-user'

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw === null) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(DEFAULT_FIXTURE_USER))
      return DEFAULT_FIXTURE_USER
    }
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setCurrentUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
  window.dispatchEvent(new CustomEvent('chefmate-auth-changed', { detail: user }))
}

export function logoutUser(): void {
  setCurrentUser(null)
}

export function loginFixtureUser(role: 'USER' | 'CHEF' | 'ADMIN' = 'USER'): void {
  if (role === 'CHEF') {
    setCurrentUser({
      id: 'user-ayesha-khan',
      email: 'ayesha.khan@example.com',
      displayName: 'Chef Ayesha Khan',
      firstName: 'Ayesha',
      lastName: 'Khan',
      role: 'CHEF',
      profileImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&q=80',
    })
  } else if (role === 'ADMIN') {
    setCurrentUser({
      id: 'user-admin-sarah',
      email: 'admin.sarah@chefmate.pk',
      displayName: 'Sarah Ahmed (Admin)',
      firstName: 'Sarah',
      lastName: 'Ahmed',
      role: 'ADMIN',
    })
  } else {
    setCurrentUser(DEFAULT_FIXTURE_USER)
  }
}

export function subscribeAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AuthUser | null>
    callback(custom.detail ?? getCurrentUser())
  }
  window.addEventListener('chefmate-auth-changed', handler)
  return () => window.removeEventListener('chefmate-auth-changed', handler)
}
