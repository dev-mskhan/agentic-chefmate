import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { PublicPageShell } from './PublicPageShell'

function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const [submitted, setSubmitted] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }
  const isSignIn = mode === 'signin'
  return <PublicPageShell><main className="mx-auto grid max-w-[1100px] gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-24"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-terracotta">Warm Hearth demo</p><h1 className="mt-4 font-display text-6xl leading-[0.95] tracking-[-0.04em]">{isSignIn ? 'Welcome back to the table.' : 'Pull up a chair.'}</h1><p className="mt-6 text-lg leading-8 text-charcoal-70">{isSignIn ? 'Sign in to keep your favorite chefs and plans close.' : 'Create a demo account to save chefs, build a cart, and follow the food home.'}</p></div><form onSubmit={submit} className="rounded-[2rem] bg-cream-dim p-6 sm:p-10"><div className="grid gap-5"><label className="grid gap-2 text-sm font-semibold" htmlFor="email">Email<input required id="email" type="email" className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-3 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label><label className="grid gap-2 text-sm font-semibold" htmlFor="password">Password<input required id="password" type="password" minLength={8} className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-3 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label>{!isSignIn && <label className="grid gap-2 text-sm font-semibold" htmlFor="name">Name<input required id="name" className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-3 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label>}<Button type="submit" className="mt-2 min-h-12">{isSignIn ? 'Sign in' : 'Create account'}</Button>{submitted && <p className="rounded-xl bg-sage/15 p-3 text-sm text-charcoal" role="status">Demo only: your {isSignIn ? 'sign-in' : 'account'} request is ready for gateway integration.</p>}</div><p className="mt-6 text-sm text-charcoal-70">{isSignIn ? 'New to ChefMate?' : 'Already have an account?'} <Link to={isSignIn ? '/signup' : '/signin'} className="font-semibold text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">{isSignIn ? 'Create one' : 'Sign in'}</Link></p></form></main></PublicPageShell>
}

export function SignInPage() { return <AuthPage mode="signin" /> }
export function SignUpPage() { return <AuthPage mode="signup" /> }
