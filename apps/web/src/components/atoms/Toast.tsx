import type { ReactNode } from 'react'

export function Toast({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'error' }) {
  const styles = tone === 'success' ? 'bg-sage text-cream' : tone === 'error' ? 'bg-rust text-cream' : 'bg-espresso text-cream'
  return <div className={`rounded-xl px-4 py-3 text-sm shadow-lg ${styles}`} role="status">{children}</div>
}
