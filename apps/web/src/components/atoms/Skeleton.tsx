export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-xl bg-charcoal/10 ${className}`} aria-hidden="true" />
}
