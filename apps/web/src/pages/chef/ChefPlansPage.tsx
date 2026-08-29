import { useEffect, useState } from 'react'
import {
  Plus,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  createChefPlan,
  getChefPlans,
} from '../../services/api/chefService'
import type { MealPlanRecord } from '../../services/api/publicCatalog'

export function ChefPlansPage() {
  const [plans, setPlans] = useState<MealPlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Plan form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('6500')
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getChefPlans()
      .then((data) => setPlans(data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !basePrice) return
    setCreating(true)

    await createChefPlan({
      name,
      description,
      basePrice: Number(basePrice) || 6500,
      frequency,
    })

    const refreshed = await getChefPlans()
    setPlans(refreshed)
    setCreating(false)
    setShowAddModal(false)
    setName('')
    setDescription('')
  }

  return (
    <ChefShell
      title="Recurring Meal Plans"
      subtitle="Design subscription meal plans for families and weekly regulars."
      actions={
        <Button onClick={() => setShowAddModal(true)} className="text-xs py-2 px-4 gap-1.5">
          <Plus size={14} /> Create Meal Plan
        </Button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge tone="success">{plan.status}</Badge>
                    <span className="text-xs font-bold uppercase tracking-wider text-terracotta">
                      {plan.frequency}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl text-charcoal">{plan.name}</h3>
                    <p className="text-xs text-charcoal-70 mt-1 line-clamp-2 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-charcoal/10 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-charcoal-70 uppercase block">
                        Base Recurring
                      </span>
                      <span className="font-display text-2xl font-bold text-charcoal tabular-nums">
                        {plan.currency} {plan.basePrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-cream-dim p-3 rounded-2xl border border-charcoal/10 text-xs">
                    <span className="text-[10px] font-bold uppercase text-terracotta block">
                      Delivery Days
                    </span>
                    <p className="text-charcoal font-medium">
                      {plan.availabilityRules.availableDays.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-charcoal/10 text-xs">
                  <span className="text-charcoal-70">
                    {plan.pauseRules.allowPause ? 'Pause & Skip enabled' : 'Fixed schedule'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Plan Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-cream p-6 sm:p-8 border border-charcoal/10 shadow-2xl space-y-4">
              <h3 className="font-display text-2xl text-charcoal">Create New Meal Plan</h3>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">Plan Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 3-Day Family Dinner Subscription"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">
                    Plan Overview
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the meals, rotating menus, and convenience..."
                    rows={3}
                    className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3 text-xs outline-none focus:border-terracotta"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">
                      Base Price (PKR)
                    </label>
                    <Input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="6500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">Frequency</label>
                    <Dropdown
                      value={frequency}
                      onChange={(val) => setFrequency(val as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY')}
                      ariaLabel="Delivery frequency"
                      options={[
                        { value: 'WEEKLY', label: 'Weekly' },
                        { value: 'BIWEEKLY', label: 'Bi-weekly' },
                        { value: 'MONTHLY', label: 'Monthly' },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-pill px-4 py-2 text-xs font-semibold text-charcoal-70 hover:bg-cream-dim"
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={creating} className="text-xs py-2 px-5">
                    {creating ? 'Saving...' : 'Publish Meal Plan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ChefShell>
  )
}
