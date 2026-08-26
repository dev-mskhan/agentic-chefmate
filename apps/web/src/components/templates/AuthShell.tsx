import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({
  children,
  image,
  imageAlt,
  brandCopy,
}: {
  children: ReactNode
  image: string
  imageAlt: string
  brandCopy?: string
}) {
  return (
    <main className="min-h-[100dvh] bg-cream text-charcoal">
      <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
        <section className="flex min-h-[100dvh] items-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <Link to="/" aria-label="ChefMate home" className="inline-flex">
              <span className="font-display text-3xl tracking-[-0.04em]">
                chefmate<span className="text-terracotta">.</span>
              </span>
            </Link>
            <div className="mt-12">{children}</div>
            <p className="mt-10 text-xs leading-5 text-charcoal-70">
              By continuing, you agree to the ChefMate terms and privacy policy.
            </p>
          </div>
        </section>
        <aside className="relative hidden min-h-[100dvh] overflow-hidden lg:block">
          <img className="absolute inset-0 h-full w-full object-cover" src={image} alt={imageAlt} />
          <div className="absolute inset-0 bg-charcoal/25" aria-hidden="true" />
          {brandCopy && (
            <p className="absolute bottom-12 left-12 max-w-sm font-display text-4xl leading-tight text-cream">
              {brandCopy}
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
