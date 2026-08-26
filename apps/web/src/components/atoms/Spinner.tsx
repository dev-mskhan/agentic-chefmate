export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-charcoal-70" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/15 border-t-terracotta" aria-hidden="true" />{label}</span>
}
