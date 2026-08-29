import { useState } from 'react'
import { CatalogCard } from '../molecules/CatalogCard'
import type { DishRecord, MealPlanRecord } from '../../services/api/publicCatalog'

const fallbackImages = [
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85',
]

interface MenuCatalogProps {
  dishes: DishRecord[]
  plans: MealPlanRecord[]
}

export function MenuCatalog({ dishes, plans }: MenuCatalogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'dishes' | 'plans'>('all')

  const tabs = [
    { key: 'all' as const, label: `All (${dishes.length + plans.length})` },
    { key: 'dishes' as const, label: `Dishes (${dishes.length})` },
    { key: 'plans' as const, label: `Meal Plans (${plans.length})` },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl text-charcoal">Menu</h2>

        <div className="flex items-center gap-1.5 rounded-pill bg-cream-dim p-1 text-xs font-semibold">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-pill px-4 py-2 transition-all ${
                activeTab === key
                  ? 'bg-terracotta text-cream shadow-sm'
                  : 'text-charcoal-70 hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(activeTab === 'all' || activeTab === 'dishes') &&
          dishes.map((dish) => (
            <CatalogCard
              key={dish.id}
              href={`/dishes/${dish.id}`}
              image={fallbackImages[0]}
              images={fallbackImages}
              title={dish.name}
              description={dish.description}
              meta={`${dish.cuisine} · ${dish.portionInfo}`}
              price={`${dish.currency} ${dish.price.toLocaleString()}`}
              rating={dish.averageRating}
              reviewCount={dish.totalReviews}
              tags={dish.dietaryTags}
              eyebrow="Dish"
              status="Available for order"
            />
          ))}
        {(activeTab === 'all' || activeTab === 'plans') &&
          plans.map((plan) => (
            <CatalogCard
              key={plan.id}
              href={`/plans/${plan.id}`}
              image={fallbackImages[2]}
              images={fallbackImages}
              title={plan.name}
              description={plan.description}
              meta={`${plan.frequency ?? 'One-off'} · ${plan.availabilityRules.availableDays.join(', ')}`}
              price={`${plan.currency} ${plan.basePrice.toLocaleString()}`}
              rating={plan.averageRating}
              reviewCount={plan.totalReviews}
              eyebrow="Meal plan"
              status="Accepting orders"
            />
          ))}
      </div>
    </section>
  )
}
