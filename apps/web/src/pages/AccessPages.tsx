import { Link, useLocation } from 'react-router-dom'
import { Button } from '../components/atoms/Button'

export function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-charcoal">
      <section className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-terracotta">403 · private kitchen</p>
        <h1 className="mt-4 font-display text-5xl">This table is reserved.</h1>
        <p className="mt-4 leading-7 text-charcoal-70">Your current demo role does not have access to this workspace.</p>
        <Link className="mt-7 inline-block" to="/"><Button>Back to ChefMate</Button></Link>
      </section>
    </main>
  )
}

export function NotFoundPage() {
  const location = useLocation()
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-charcoal">
      <section className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-terracotta">404 · no such plate</p>
        <h1 className="mt-4 font-display text-5xl">We could not find that page.</h1>
        <p className="mt-4 leading-7 text-charcoal-70">There is no ChefMate route for <code className="rounded bg-cream-dim px-1.5 py-0.5 text-sm">{location.pathname}</code>.</p>
        <Link className="mt-7 inline-block" to="/"><Button variant="secondary">Return home</Button></Link>
      </section>
    </main>
  )
}
