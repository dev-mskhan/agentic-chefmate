import type { ReactNode } from 'react'

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 lg:px-12 2xl:px-16 ${className}`}>{children}</main>
}
