import { useEffect, useState, type FormEvent } from 'react'
import { MapPin, Plus, Check, Home, Briefcase } from 'lucide-react'
import { Button } from '../../../components/atoms/Button'
import { Input } from '../../../components/atoms/Input'
import { createAddress, getAddresses } from '../../../lib/api/checkout'
import type { AddressRecord, AuthUser } from '../types'

interface AddressStepProps {
  user: AuthUser | null
  selectedAddressId?: string
  onAddressSelect: (addressId: string) => void
  disabled?: boolean
}

export function AddressStep({ user, selectedAddressId, onAddressSelect, disabled = false }: AddressStepProps) {
  const [addresses, setAddresses] = useState<AddressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [label, setLabel] = useState('Home')
  const [line1, setLine1] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('Lahore')
  const [postalCode, setPostalCode] = useState('54000')
  const [saveForFuture, setSaveForFuture] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getAddresses(user?.id).then((list) => {
      if (!active) return
      setAddresses(list)
      setLoading(false)

      if (list.length === 0) {
        setShowForm(true)
      } else {
        const defaultAddr = list.find((a) => a.isDefault) ?? list[0]
        if (defaultAddr && !selectedAddressId) {
          onAddressSelect(defaultAddr.id)
        }
      }
    }).catch(() => {
      if (!active) return
      setLoading(false)
      setShowForm(true)
    })

    return () => {
      active = false
    }
  }, [user?.id])

  const handleCreateAddress = async (e: FormEvent) => {
    e.preventDefault()
    if (!line1 || !area || !city) {
      setError('Please fill in street address, area, and city.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const newAddr = await createAddress(user?.id, {
        label: label.trim() || 'Home',
        line1: line1.trim(),
        area: area.trim(),
        city: city.trim(),
        postalCode: postalCode.trim() || '54000',
        isDefault: saveForFuture,
      })
      setAddresses((prev) => [...prev, newAddr])
      setShowForm(false)
      onAddressSelect(newAddr.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save address.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-cream p-6 text-sm text-charcoal-70 animate-pulse">
        Loading saved addresses...
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-charcoal/10 bg-cream p-6 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-terracotta">
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Delivery Address</span>
        </div>
        {addresses.length > 0 && !showForm && (
          <Button variant="ghost" className="text-xs gap-1.5 py-1 px-3" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Add new address
          </Button>
        )}
      </div>

      <h3 className="mt-2 font-display text-xl text-charcoal">Where should we deliver?</h3>

      {/* Case 1: Selectable address list */}
      {!showForm && addresses.length > 0 && (
        <div className="mt-4 grid gap-3">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id
            const IconComp = addr.label.toLowerCase().includes('office') ? Briefcase : Home

            return (
              <label
                key={addr.id}
                onClick={() => onAddressSelect(addr.id)}
                className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-terracotta bg-terracotta-10 shadow-sm'
                    : 'border-charcoal/10 bg-cream hover:border-charcoal/20'
                }`}
              >
                <input
                  type="radio"
                  name="addressSelection"
                  value={addr.id}
                  checked={isSelected}
                  onChange={() => onAddressSelect(addr.id)}
                  className="mt-1 accent-terracotta"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <IconComp className="h-4 w-4 text-charcoal-70" />
                    <span className="font-semibold text-charcoal text-sm">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="rounded-pill bg-terracotta/10 px-2 py-0.5 text-[10px] font-semibold text-terracotta">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-charcoal-70">
                    {addr.line1}, {addr.area}, {addr.city} {addr.postalCode}
                  </p>
                </div>
                {isSelected && <Check className="h-5 w-5 text-terracotta shrink-0" />}
              </label>
            )
          })}
        </div>
      )}

      {/* Case 2: Address form (new user or adding address) */}
      {showForm && (
        <form onSubmit={handleCreateAddress} className="mt-4 space-y-4 rounded-2xl bg-cream-dim/50 p-5 border border-charcoal/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">New Address Details</span>
            {addresses.length > 0 && (
              <button
                type="button"
                className="text-xs text-charcoal-70 hover:text-terracotta underline"
                onClick={() => setShowForm(false)}
              >
                Use saved address
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="addr-label"
              label="Address Label"
              placeholder="e.g. Home, Office, Parent's house"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <Input
              id="addr-city"
              label="City"
              placeholder="e.g. Lahore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <Input
            id="addr-line1"
            label="Street Address / House No."
            placeholder="House #, Street #, Block"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="addr-area"
              label="Area / Sector"
              placeholder="e.g. Gulberg III, DHA Phase 5"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />
            <Input
              id="addr-postal"
              label="Postal Code"
              placeholder="54000"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2.5 pt-1 text-xs text-charcoal-70 cursor-pointer">
            <input
              type="checkbox"
              checked={saveForFuture}
              onChange={(e) => setSaveForFuture(e.target.checked)}
              className="accent-terracotta rounded"
            />
            <span>Save this address for future orders</span>
          </label>

          {error && <div className="rounded-xl bg-rust/10 p-3 text-xs text-rust font-medium">{error}</div>}

          <Button type="submit" className="w-full text-xs py-2.5" disabled={saving}>
            {saving ? 'Saving address...' : 'Use this address'}
          </Button>
        </form>
      )}
    </div>
  )
}
