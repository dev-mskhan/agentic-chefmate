import { Badge } from '../atoms/Badge'
import { EmptyState } from '../atoms/EmptyState'
import type { ReviewRecord } from '../../services/api/publicCatalog'

export function Reviews({ reviews }: { reviews: readonly ReviewRecord[] }) {
  if (!reviews.length) return <EmptyState title="No published reviews yet" description="Reviews will appear here after customers share their order." />
  return (
    <div className="grid gap-5">
      {reviews.map((review) => (
        <article key={review.id} className="border-b border-charcoal/10 pb-5 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-saffron" aria-label={`${review.rating} out of 5 stars`}>
              {'★'.repeat(review.rating)}<span className="text-charcoal/15">{'★'.repeat(5 - review.rating)}</span>
            </span>
            <div className="flex items-center gap-2 text-xs text-charcoal-70">
              {review.verifiedPurchase && <Badge tone="success">Verified order</Badge>}
              <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
            </div>
          </div>
          <p className="mt-3 max-w-[60ch] text-sm leading-7 text-charcoal-70">{review.text}</p>
        </article>
      ))}
    </div>
  )
}
