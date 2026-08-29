import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Modal } from '../atoms/Modal'

interface CartConflictModalProps {
  open: boolean
  onClose: () => void
  onConfirmReplace: () => void
  existingChefName?: string
  newChefName?: string
}

export function CartConflictModal({
  open,
  onClose,
  onConfirmReplace,
  existingChefName = 'your current chef',
  newChefName = 'the new chef',
}: CartConflictModalProps) {
  return (
    <Modal open={open} title="One chef per order" onClose={onClose}>
      <div className="p-2 space-y-4">
        <div className="flex items-center gap-3 text-terracotta">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-10">
            <AlertTriangle className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">Basket Conflict</span>
            <h3 className="font-display text-xl text-charcoal leading-tight">One chef per order</h3>
          </div>
        </div>

        <p className="text-sm leading-6 text-charcoal-70">
          Your basket currently contains dishes from <strong>{existingChefName}</strong>. Each order must be prepared by a single home kitchen.
        </p>

        <p className="text-xs leading-5 text-charcoal-70/80 rounded-xl bg-cream-dim p-3">
          Would you like to clear your current basket and start a new order with <strong>{newChefName}</strong>?
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="secondary" className="w-full text-xs" onClick={onClose}>
            Keep current basket
          </Button>
          <Button className="w-full text-xs gap-1.5" onClick={onConfirmReplace}>
            <Trash2 className="h-3.5 w-3.5" /> Clear & add new dish
          </Button>
        </div>
      </div>
    </Modal>
  )
}
