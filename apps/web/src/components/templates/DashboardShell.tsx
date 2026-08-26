import type { ReactNode } from 'react'
import { PageContainer } from './PageContainer'

export function DashboardShell({ title, navigation, children }: { title: string; navigation: ReactNode; children: ReactNode }) {
  return <div className="min-h-screen bg-cream-dim"><header className="border-b border-charcoal/10 bg-cream"><PageContainer className="flex items-center justify-between py-4"><span className="font-display text-2xl">chefmate<span className="text-terracotta">.</span></span>{navigation}</PageContainer></header><PageContainer><h1 className="font-display text-4xl">{title}</h1><div className="mt-8">{children}</div></PageContainer></div>
}
