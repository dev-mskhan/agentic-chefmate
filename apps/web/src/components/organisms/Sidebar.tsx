import { NavLink } from 'react-router-dom'

export function Sidebar({ items }: { items: readonly { label: string; href: string }[] }) {
  return <aside className="hidden w-64 shrink-0 border-r border-charcoal/10 bg-cream p-5 lg:block"><nav aria-label="Workspace"><ul className="grid gap-1">{items.map((item) => <li key={item.href}><NavLink to={item.href} className={({ isActive }) => `block rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? 'bg-terracotta text-cream' : 'text-charcoal-70 hover:bg-cream-dim hover:text-charcoal'}`}>{item.label}</NavLink></li>)}</ul></nav></aside>
}
