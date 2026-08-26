import type { ReactNode } from 'react'
import { Sidebar } from '../organisms/Sidebar'
import { Topbar } from '../organisms/Topbar'

export function RoleShell({ role, children, navigation = [] }: { role: 'Customer' | 'Chef' | 'Admin'; children: ReactNode; navigation?: readonly { label: string; href: string }[] }) {
  return <div data-role={role.toLowerCase()} className="min-h-screen bg-cream text-charcoal"><div className="flex min-h-screen"><Sidebar items={navigation} /><div className="min-w-0 flex-1"><Topbar title={role} /><main className="p-4 sm:p-6">{children}</main></div></div></div>
}
