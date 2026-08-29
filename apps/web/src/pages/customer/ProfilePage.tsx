import { useEffect, useState } from 'react'
import {
  Bell,
  Check,
  MapPin,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getUserProfile,
  updateUserProfile,
  type UserAddress,
  type UserProfileRecord,
} from '../../services/api/userService'
import { setCurrentUser, getCurrentUser } from '../../lib/auth'

const ALLERGIES_LIST = [
  'Peanuts',
  'Tree nuts',
  'Dairy',
  'Eggs',
  'Wheat / Gluten',
  'Fish',
  'Shellfish',
  'Soy',
  'Sesame',
]

const DIETARY_LIST = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Low Carb',
  'High Protein',
]

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [newAddrLabel, setNewAddrLabel] = useState('')
  const [newAddrLine1, setNewAddrLine1] = useState('')
  const [newAddrArea, setNewAddrArea] = useState('')
  const [newAddrCity, setNewAddrCity] = useState('Lahore')
  const [newAddrPostal] = useState('54000')

  useEffect(() => {
    getUserProfile()
      .then((data) => setProfile(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !profile) {
    return (
      <PublicShell>
        <PageContainer className="pb-24 pt-8 sm:pt-12">
          <Skeleton className="h-96 w-full rounded-3xl" />
        </PageContainer>
      </PublicShell>
    )
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)

    const updated = await updateUserProfile(profile)
    setProfile(updated)

    // Update global auth user display name
    const current = getCurrentUser()
    if (current) {
      setCurrentUser({
        ...current,
        displayName: `${profile.firstName} ${profile.lastName}`,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      })
    }

    setSaving(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const toggleAllergy = (allergy: string) => {
    const next = profile.allergies.includes(allergy)
      ? profile.allergies.filter((a) => a !== allergy)
      : [...profile.allergies, allergy]
    setProfile({ ...profile, allergies: next })
  }

  const toggleDietary = (tag: string) => {
    const next = profile.dietaryPreferences.includes(tag)
      ? profile.dietaryPreferences.filter((d) => d !== tag)
      : [...profile.dietaryPreferences, tag]
    setProfile({ ...profile, dietaryPreferences: next })
  }

  const handleAddAddress = () => {
    if (!newAddrLabel || !newAddrLine1 || !newAddrArea) return

    const newAddr: UserAddress = {
      id: `addr-${Date.now()}`,
      userId: profile.userId,
      label: newAddrLabel,
      line1: newAddrLine1,
      area: newAddrArea,
      city: newAddrCity,
      postalCode: newAddrPostal,
      isDefault: profile.addresses.length === 0,
    }

    const nextAddresses = [...profile.addresses, newAddr]
    setProfile({ ...profile, addresses: nextAddresses })
    updateUserProfile({ addresses: nextAddresses })

    setNewAddrLabel('')
    setNewAddrLine1('')
    setNewAddrArea('')
    setShowAddressModal(false)
  }

  const handleDeleteAddress = (id: string) => {
    const next = profile.addresses.filter((a) => a.id !== id)
    setProfile({ ...profile, addresses: next })
    updateUserProfile({ addresses: next })
  }

  const handleSetDefaultAddress = (id: string) => {
    const next = profile.addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }))
    setProfile({ ...profile, addresses: next })
    updateUserProfile({ addresses: next })
  }

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
              <SlidersHorizontal size={14} /> Customer Dashboard
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
              Profile & Preferences
            </h1>
            <p className="text-xs text-charcoal-70 mt-1">
              Manage personal details, saved delivery addresses, dietary preferences, and spice tolerance.
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-pill bg-sage/15 px-4 py-2 text-xs font-bold text-sage">
              <Check size={14} /> Changes saved successfully
            </div>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-10">
          {/* Personal Information */}
          <section className="rounded-3xl border border-charcoal/10 bg-cream p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
              <User size={18} className="text-terracotta" /> Personal Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-charcoal" htmlFor="prof-first">
                  First name
                </label>
                <Input
                  id="prof-first"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-charcoal" htmlFor="prof-last">
                  Last name
                </label>
                <Input
                  id="prof-last"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-charcoal" htmlFor="prof-phone">
                  Phone number
                </label>
                <Input
                  id="prof-phone"
                  value={profile.phone ?? ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+92-300-0000000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-charcoal" htmlFor="prof-spice">
                  Preferred Spice Level
                </label>
                <Dropdown
                  value={profile.spiceLevel}
                  onChange={(val) =>
                    setProfile({
                      ...profile,
                      spiceLevel: val as UserProfileRecord['spiceLevel'],
                    })
                  }
                  ariaLabel="Preferred spice level"
                  options={[
                    { value: 'MILD', label: 'Mild (Gentle & fragrant)' },
                    { value: 'MEDIUM', label: 'Medium (Balanced traditional spice)' },
                    { value: 'SPICY', label: 'Spicy (Authentic heat)' },
                    { value: 'EXTRA_SPICY', label: 'Extra Spicy (Fiery)' },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Saved Delivery Addresses */}
          <section className="rounded-3xl border border-charcoal/10 bg-cream p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
                <MapPin size={18} className="text-terracotta" /> Saved Delivery Addresses
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="inline-flex items-center gap-1.5 rounded-pill bg-cream-dim border border-charcoal/15 px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors"
              >
                <Plus size={14} /> Add Address
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {profile.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`rounded-2xl p-4 border transition-all ${
                    addr.isDefault
                      ? 'bg-cream-dim/90 border-terracotta shadow-sm'
                      : 'bg-cream border-charcoal/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-charcoal">{addr.label}</strong>
                        {addr.isDefault && (
                          <span className="rounded-pill bg-terracotta text-cream px-2 py-0.5 text-[9px] font-bold uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-70 mt-1 leading-relaxed">
                        {addr.line1}
                        <br />
                        {addr.area}, {addr.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[11px] font-semibold text-terracotta hover:underline mr-1"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-charcoal-70 hover:text-terracotta p-1"
                        title="Delete address"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dietary Preferences & Allergies */}
          <section className="rounded-3xl border border-charcoal/10 bg-cream p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-terracotta" /> Dietary Tags & Allergens
            </h2>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-charcoal block mb-2">
                  Dietary Preferences
                </span>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_LIST.map((tag) => {
                    const active = profile.dietaryPreferences.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDietary(tag)}
                        className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-terracotta text-cream border-terracotta shadow-sm'
                            : 'bg-cream-dim text-charcoal-70 border-charcoal/10 hover:border-charcoal/30'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-charcoal block mb-2">
                  Allergies to Exclude
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES_LIST.map((allergy) => {
                    const active = profile.allergies.includes(allergy)
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => toggleAllergy(allergy)}
                        className={`rounded-pill px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-terracotta-dark text-cream border-terracotta-dark shadow-sm'
                            : 'bg-cream-dim text-charcoal-70 border-charcoal/10 hover:border-charcoal/30'
                        }`}
                      >
                        {allergy}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Channels */}
          <section className="rounded-3xl border border-charcoal/10 bg-cream p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
              <Bell size={18} className="text-terracotta" /> Notification Channels
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl bg-cream-dim p-4 border border-charcoal/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.inApp}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: {
                          ...profile.notificationPreferences.channels,
                          inApp: e.target.checked,
                        },
                      },
                    })
                  }
                  className="rounded text-terracotta h-4 w-4"
                />
                <span className="text-xs font-semibold text-charcoal">In-App Alerts</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-cream-dim p-4 border border-charcoal/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.email}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: {
                          ...profile.notificationPreferences.channels,
                          email: e.target.checked,
                        },
                      },
                    })
                  }
                  className="rounded text-terracotta h-4 w-4"
                />
                <span className="text-xs font-semibold text-charcoal">Email Notifications</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-cream-dim p-4 border border-charcoal/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences.channels.push}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: {
                          ...profile.notificationPreferences.channels,
                          push: e.target.checked,
                        },
                      },
                    })
                  }
                  className="rounded text-terracotta h-4 w-4"
                />
                <span className="text-xs font-semibold text-charcoal">Web Push Delivery</span>
              </label>
            </div>
          </section>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-charcoal/10">
            <Button type="submit" disabled={saving} className="py-3 px-6 text-xs gap-2">
              <Save size={15} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>

        {/* Add Address Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-cream p-6 border border-charcoal/10 shadow-2xl space-y-4">
              <h3 className="font-display text-xl text-charcoal">Add New Delivery Address</h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">Label</label>
                  <Input
                    value={newAddrLabel}
                    onChange={(e) => setNewAddrLabel(e.target.value)}
                    placeholder="e.g. Home, Office, Guest House"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">
                    Street Address & Block
                  </label>
                  <Input
                    value={newAddrLine1}
                    onChange={(e) => setNewAddrLine1(e.target.value)}
                    placeholder="e.g. House 12, Street 4, Sector G"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">Area</label>
                    <Input
                      value={newAddrArea}
                      onChange={(e) => setNewAddrArea(e.target.value)}
                      placeholder="e.g. Gulberg III"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">City</label>
                    <Input
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      placeholder="Lahore"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="rounded-pill px-4 py-2 text-xs font-semibold text-charcoal-70 hover:bg-cream-dim"
                >
                  Cancel
                </button>
                <Button onClick={handleAddAddress} className="text-xs py-2 px-4">
                  Add Address
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </PublicShell>
  )
}
