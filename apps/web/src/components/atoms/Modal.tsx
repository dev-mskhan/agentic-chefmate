import type { ReactNode } from 'react'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/40 p-4" role="presentation" onMouseDown={onClose}><section className="w-full max-w-lg rounded-2xl bg-cream p-6 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><h2 id="modal-title" className="font-display text-2xl">{title}</h2><button type="button" className="min-h-11 min-w-11 rounded-full text-xl text-charcoal-70 hover:bg-cream-dim" onClick={onClose} aria-label="Close dialog">×</button></div><div className="mt-5">{children}</div></section></div>
}
