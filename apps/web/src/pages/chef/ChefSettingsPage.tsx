import { useEffect, useState } from 'react'
import {
  Check,
  CreditCard,
  Save,
  User,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import { getChefOverview } from '../../services/api/chefService'

export function ChefSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [kitchenName, setKitchenName] = useState("Ayesha's Lahore Dastarkhwan")
  const [bio, setBio] = useState(
    'Specializing in slow-cooked traditional Punjabi dishes, aromatic karahis, and authentic earthenware dum recipes passed down from my grandmother.',
  )
  const [bankAccount, setBankAccount] = useState('PK36HABB0000123456784081')
  const [bankTitle, setBankTitle] = useState('Ayesha Khan')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    getChefOverview().then(() => setLoading(false))
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }, 400)
  }

  if (loading) {
    return (
      <ChefShell title="Kitchen Settings">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </ChefShell>
    )
  }

  return (
    <ChefShell
      title="Kitchen Settings"
      subtitle="Manage your home kitchen identity, delivery areas, verified bank account, and notifications."
    >
      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-sage/15 p-4 text-xs font-bold text-sage border border-sage/20">
            <Check size={16} /> Kitchen settings saved successfully.
          </div>
        )}

        {/* Profile Info */}
        <section className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
            <User size={18} className="text-terracotta" /> Kitchen Identity & Story
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal">Kitchen Brand Name</label>
              <Input
                value={kitchenName}
                onChange={(e) => setKitchenName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal">
                Chef Bio & Culinary Philosophy
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3.5 text-xs outline-none focus:border-terracotta leading-relaxed"
                required
              />
            </div>
          </div>
        </section>

        {/* Banking and Payout Settlement */}
        <section className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
            <CreditCard size={18} className="text-terracotta" /> Verified Payout Bank Account
          </h2>
          <p className="text-xs text-charcoal-70">
            Where your weekly order earnings and customer payouts are deposited.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal">Account Title</label>
              <Input
                value={bankTitle}
                onChange={(e) => setBankTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-charcoal">IBAN Number</label>
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* Action Controls */}
        <div className="flex items-center justify-end pt-4 border-t border-charcoal/10">
          <Button type="submit" disabled={saving} className="text-xs py-2.5 px-6 gap-2">
            <Save size={14} /> {saving ? 'Saving Changes...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </ChefShell>
  )
}
