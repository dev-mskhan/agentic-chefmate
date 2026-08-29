import { useEffect, useState } from 'react'
import { getCurrentUser, loginFixtureUser, logoutUser, subscribeAuthChange, type AuthUser } from '../lib/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser())

  useEffect(() => {
    return subscribeAuthChange((updated) => {
      setUser(updated)
    })
  }, [])

  return {
    user,
    isAuthenticated: Boolean(user),
    role: user?.role ?? null,
    logout: logoutUser,
    loginFixture: loginFixtureUser,
  }
}
