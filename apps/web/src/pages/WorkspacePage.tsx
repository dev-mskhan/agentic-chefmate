import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useListCollectionQuery } from '../lib/api'
import { demoIdentity } from '../lib/auth'
import { RoleShell } from '../components/templates/RoleShell'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'

const navigation = {
  Customer: [
    { label: 'Overview', href: '/account' },
    { label: 'Discover', href: '/discover' },
    { label: 'Orders', href: '/orders' },
    { label: 'Subscriptions', href: '/subscriptions' },
    { label: 'Profile', href: '/profile' },
  ],
  Chef: [
    { label: 'Kitchen overview', href: '/chef' },
    { label: 'Dishes', href: '/chef/dishes' },
    { label: 'Plans', href: '/chef/plans' },
    { label: 'Orders', href: '/chef/orders' },
    { label: 'Earnings', href: '/chef/earnings' },
  ],
  Admin: [
    { label: 'Operations', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Moderation', href: '/admin/moderation' },
    { label: 'Payouts', href: '/admin/payouts' },
  ],
} as const

type WorkspaceRole = keyof typeof navigation

const roleLabels = {
  Customer: 'Customer',
  Chef: 'Chef',
  Admin: 'Admin',
} as const

function DiscoveryPreview() {
  const query = useListCollectionQuery({ collection: 'chefs', page: 1, pageSize: 2 })
  if (query.isLoading) return <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
  if (query.isError) return <EmptyState title="The market is taking a breather" description="We could not load chefs right now. Try again when the kitchen is back online." action={<Button onClick={() => query.refetch()}>Try again</Button>} />
  if (!query.data?.items.length) return <EmptyState title="No chefs nearby yet" description="Try widening your search area to discover more home cooks." />
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {query.data.items.map((chef) => (
        <article className="rounded-2xl bg-cream p-5 shadow-sm" key={chef.id}>
          <p className="text-sm text-charcoal-70">{'serviceArea' in chef ? chef.serviceArea : 'ChefMate kitchen'}</p>
          <h2 className="mt-2 font-display text-2xl">{'displayName' in chef ? chef.displayName : chef.id}</h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-70">{'bio' in chef ? chef.bio : 'A local home kitchen.'}</p>
        </article>
      ))}
    </div>
  )
}

export function PublicPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <main className="min-h-screen bg-cream px-6 py-12 text-charcoal sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-terracotta hover:text-terracotta-dark" to="/">← ChefMate home</Link>
        <p className="mt-16 text-sm font-semibold uppercase tracking-[0.16em] text-terracotta">Warm Hearth</p>
        <h1 className="mt-3 font-display text-5xl">{title}</h1>
        <p className="mt-4 max-w-[58ch] leading-7 text-charcoal-70">{description}</p>
        {children && <div className="mt-10">{children}</div>}
      </div>
    </main>
  )
}

export function DiscoveryPage() {
  return <PublicPage title="Find your next favourite table." description="Browse home cooks and dishes prepared close to you."><DiscoveryPreview /></PublicPage>
}

export function WorkspacePage({ role, title, description }: { role: WorkspaceRole; title: string; description: string }) {
  const { orderId, chefId, dishId, planId, subscriptionId } = useParams()
  const contextId = orderId ?? chefId ?? dishId ?? planId ?? subscriptionId
  return (
    <RoleShell role={roleLabels[role]} navigation={navigation[role]}>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-terracotta">{role} workspace</p>
        <h2 className="mt-3 font-display text-4xl">{title}</h2>
        <p className="mt-3 max-w-[58ch] leading-7 text-charcoal-70">{description}</p>
        {contextId && <p className="mt-6 rounded-xl bg-cream-dim px-4 py-3 text-sm text-charcoal-70">Viewing record <strong className="text-charcoal">{contextId}</strong></p>}
        <div className="mt-8 rounded-2xl bg-cream p-6 shadow-sm">
          <h3 className="font-display text-2xl">Demo mode is ready</h3>
          <p className="mt-2 max-w-[55ch] text-sm leading-6 text-charcoal-70">This route is wired to backend-shaped contracts and can switch to the gateway without changing the page surface.</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-70">Signed in as {demoIdentity.email}</p>
        </div>
      </div>
    </RoleShell>
  )
}
