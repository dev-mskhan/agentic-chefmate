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
    { key: 'all' as const, label: `All Menu Items (${dishes.length + plans.length})` },
    { key: 'dishes' as const, label: `Dishes (${dishes.length})` },
    { key: 'plans' as const, label: `Meal Plans (${plans.length})` },
  ]

  const showDishes = activeTab === 'all' || activeTab === 'dishes'
  const showPlans = activeTab === 'all' || activeTab === 'plans'

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-terracotta block">
            Cooked to Order
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-charcoal font-bold mt-0.5">
            Full Kitchen Menu
          </h2>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl sm:rounded-pill bg-cream-dim p-1.5 text-xs font-semibold border border-charcoal/10">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-pill px-3.5 py-1.5 transition-all text-xs font-semibold ${
                activeTab === key
                  ? 'bg-terracotta text-cream shadow-sm'
                  : 'text-charcoal-70 hover:text-charcoal hover:bg-cream/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {showDishes &&
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
              eyebrow="Single Dish"
              status="Available for order"
            />
          ))}

        {showPlans &&
          plans.map((plan) => (
            <CatalogCard
              key={plan.id}
              href={`/plans/${plan.id}`}
              image={fallbackImages[2]}
              images={fallbackImages}
              title={plan.name}
              description={plan.description}
              meta={`${plan.frequency ?? 'Weekly'} · ${plan.availabilityRules.availableDays.join(', ')}`}
              price={`${plan.currency} ${plan.basePrice.toLocaleString()}`}
              rating={plan.averageRating}
              reviewCount={plan.totalReviews}
              eyebrow="Recurring Meal Plan"
              status="Accepting subscribers"
            />
          ))}
      </div>

      {showDishes && dishes.length === 0 && showPlans && plans.length === 0 && (
        <div className="rounded-3xl bg-cream border border-charcoal/10 p-8 text-center text-xs text-charcoal-70">
          No menu items currently available for this category.
        </div>
      )}
    </section>
  )
}
