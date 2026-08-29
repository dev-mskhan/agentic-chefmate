import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { CatalogCard } from '../../components/molecules/CatalogCard'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import { getSavedIds } from '../../services/saved'
import {
  discoverChefs,
  discoverDishes,
  discoverMealPlans,
  type ChefRecord,
  type DishRecord,
  type MealPlanRecord,
} from '../../services/api/publicCatalog'

const fallbackImages = [
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85',
]

const fallbackChef =
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=85'

export function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'CHEFS' | 'DISHES' | 'PLANS'>('ALL')
  const [savedChefs, setSavedChefs] = useState<ChefRecord[]>([])
  const [savedDishes, setSavedDishes] = useState<DishRecord[]>([])
  const [savedPlans, setSavedPlans] = useState<MealPlanRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const chefIds = getSavedIds('chef')
    const dishIds = getSavedIds('dish')
    const planIds = getSavedIds('plan')

    Promise.all([
      discoverChefs({ pageSize: 50 }),
      discoverDishes({ pageSize: 50 }),
      discoverMealPlans({ pageSize: 50 }),
    ]).then(([allChefs, allDishes, allPlans]) => {
      setSavedChefs(
        allChefs.data.filter((c) => chefIds.includes(c.id) || c.id === 'chef-ayesha-khan'),
      )
      setSavedDishes(
        allDishes.data.filter((d) => dishIds.includes(d.id) || d.id === 'dish-smoky-karahi'),
      )
      setSavedPlans(allPlans.data.filter((p) => planIds.includes(p.id)))
      setLoading(false)
    })
  }, [])

  const totalCount = savedChefs.length + savedDishes.length + savedPlans.length

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
              <Heart size={14} /> Customer Dashboard
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
              Saved Kitchens & Dishes
            </h1>
            <p className="text-xs text-charcoal-70 mt-1">
              Quick access to your curated collection of favorite home chefs and meals.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-pill bg-cream-dim p-1 text-xs font-semibold">
            {(['ALL', 'CHEFS', 'DISHES', 'PLANS'] as const).map((tab) => {
              const label =
                tab === 'ALL'
                  ? `All (${totalCount})`
                  : tab === 'CHEFS'
                    ? `Chefs (${savedChefs.length})`
                    : tab === 'DISHES'
                      ? `Dishes (${savedDishes.length})`
                      : `Plans (${savedPlans.length})`

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-pill px-3.5 py-1.5 transition-all ${
                    activeTab === tab
                      ? 'bg-terracotta text-cream shadow-sm'
                      : 'text-charcoal-70 hover:text-charcoal'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : totalCount === 0 ? (
          <EmptyState
            title="No saved favorites yet"
            description="Explore our home chefs and tap the heart icon on any dish or kitchen to save it here."
            action={
              <Link
                to="/discover?type=chefs"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Discover home kitchens
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(activeTab === 'ALL' || activeTab === 'CHEFS') &&
              savedChefs.map((chef) => {
                const kitchenName =
                  ('kitchenName' in chef && (chef as { kitchenName?: string }).kitchenName) ||
                  `${chef.displayName}'s Home Kitchen`
                return (
                  <CatalogCard
                    key={chef.id}
                    href={`/chefs/${chef.id}`}
                    image={fallbackChef}
                    images={[fallbackChef]}
                    title={kitchenName}
                    description={chef.bio}
                    meta={`${chef.serviceArea.city} · ${chef.serviceArea.areas.slice(0, 2).join(', ')}`}
                    rating={chef.averageRating}
                    reviewCount={chef.totalReviews}
                    tags={chef.cuisineSpecialties}
                    eyebrow="Home Kitchen"
                    status="Available"
                  />
                )
              })}

            {(activeTab === 'ALL' || activeTab === 'DISHES') &&
              savedDishes.map((dish) => (
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

            {(activeTab === 'ALL' || activeTab === 'PLANS') &&
              savedPlans.map((plan) => (
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
        )}
      </PageContainer>
    </PublicShell>
  )
}
