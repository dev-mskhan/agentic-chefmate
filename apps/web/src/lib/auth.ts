import type { AuthUser } from '../features/checkout/types'

const AUTH_KEY = 'chefmate-auth-user'

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
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

export function subscribeAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AuthUser | null>
    callback(custom.detail ?? getCurrentUser())
  }
  window.addEventListener('chefmate-auth-changed', handler)
  return () => window.removeEventListener('chefmate-auth-changed', handler)
}
