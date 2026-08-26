import { Button } from '../atoms/Button'

export function Pagination({ page, hasNext, onPrevious, onNext }: { page: number; hasNext: boolean; onPrevious: () => void; onNext: () => void }) {
  return <nav className="flex items-center justify-between gap-3" aria-label="Pagination"><Button variant="secondary" onClick={onPrevious} disabled={page <= 1}>Previous</Button><span className="text-sm text-charcoal-70">Page {page}</span><Button variant="secondary" onClick={onNext} disabled={!hasNext}>Next</Button></nav>
}
