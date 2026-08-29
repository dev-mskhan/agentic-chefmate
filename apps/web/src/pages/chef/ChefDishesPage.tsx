import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  createChefDish,
  deleteChefDish,
  getChefDishes,
  updateChefDish,
} from '../../services/api/chefService'
import type { DishRecord } from '../../services/api/publicCatalog'

export function ChefDishesPage() {
  const [dishes, setDishes] = useState<DishRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state for creating a new dish
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('1800')
  const [cuisine, setCuisine] = useState('Punjabi')
  const [portionInfo, setPortionInfo] = useState('Serves 2-3')
  const [dietaryTag, setDietaryTag] = useState('Halal')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getChefDishes()
      .then((data) => setDishes(data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price) return
    setCreating(true)

    await createChefDish({
      name,
      description,
      price: Number(price) || 1800,
      cuisine,
      portionInfo,
      dietaryTags: [dietaryTag],
    })

    const refreshed = await getChefDishes()
    setDishes(refreshed)
    setCreating(false)
    setShowAddModal(false)
    setName('')
    setDescription('')
  }

  const handleDelete = async (dishId: string) => {
    if (!confirm('Are you sure you want to delete this dish from your kitchen?')) return
    await deleteChefDish(dishId)
    const refreshed = await getChefDishes()
    setDishes(refreshed)
  }

  const handleToggleStatus = async (dish: DishRecord) => {
    const nextStatus = dish.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await updateChefDish(dish.id, { status: nextStatus })
    const refreshed = await getChefDishes()
    setDishes(refreshed)
  }

  return (
    <ChefShell
      title="Dishes & Menu Items"
      subtitle="Publish, edit, and manage portion sizes and pricing for your home-cooked specialties."
      actions={
        <Button onClick={() => setShowAddModal(true)} className="text-xs py-2 px-4 gap-1.5">
          <Plus size={14} /> Add New Dish
        </Button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => {
              const isActive = dish.status === 'ACTIVE'

              return (
                <div
                  key={dish.id}
                  className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge tone={isActive ? 'success' : 'neutral'}>
                        {dish.status}
                      </Badge>
                      <span className="text-xs font-semibold text-terracotta">
                        {dish.cuisine}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-xl text-charcoal">{dish.name}</h3>
                      <p className="text-xs text-charcoal-70 mt-1 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-charcoal/10">
                      <div>
                        <span className="text-[10px] text-charcoal-70 uppercase block">
                          Price
                        </span>
                        <span className="font-display text-xl font-bold text-charcoal tabular-nums">
                          {dish.currency} {dish.price.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-charcoal-70">
                        {dish.portionInfo}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dish.dietaryTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-pill bg-cream-dim px-2.5 py-0.5 text-[10px] font-semibold text-charcoal"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-charcoal/10">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(dish)}
                      className={`text-xs font-bold ${
                        isActive ? 'text-charcoal-70 hover:text-terracotta' : 'text-sage'
                      }`}
                    >
                      {isActive ? 'Pause Dish' : 'Activate Dish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(dish.id)}
                      className="p-1.5 text-charcoal-70 hover:text-terracotta transition-colors"
                      title="Delete dish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Dish Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-cream p-6 sm:p-8 border border-charcoal/10 shadow-2xl space-y-4">
              <h3 className="font-display text-2xl text-charcoal">Add New Dish</h3>

              <form onSubmit={handleCreateDish} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">Dish Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Claypot Chicken Handi"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-charcoal">
                    Description & Flavor Profile
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the recipe, cooking technique, and aroma..."
                    rows={3}
                    className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3 text-xs outline-none focus:border-terracotta"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">
                      Price (PKR)
                    </label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">Portion</label>
                    <Input
                      value={portionInfo}
                      onChange={(e) => setPortionInfo(e.target.value)}
                      placeholder="Serves 2-3"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">Cuisine</label>
                    <Dropdown
                      value={cuisine}
                      onChange={(val) => setCuisine(val)}
                      ariaLabel="Cuisine specialty"
                      options={[
                        { value: 'Punjabi', label: 'Punjabi' },
                        { value: 'Karachi', label: 'Karachi' },
                        { value: 'Mughlai', label: 'Mughlai' },
                        { value: 'Sindhi', label: 'Sindhi' },
                        { value: 'Home cooking', label: 'Home Cooking' },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-charcoal">Dietary</label>
                    <Dropdown
                      value={dietaryTag}
                      onChange={(val) => setDietaryTag(val)}
                      ariaLabel="Dietary preference"
                      options={[
                        { value: 'Halal', label: 'Halal' },
                        { value: 'Vegetarian', label: 'Vegetarian' },
                        { value: 'Vegan', label: 'Vegan' },
                        { value: 'Gluten-free', label: 'Gluten-free' },
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
                    {creating ? 'Saving...' : 'Publish Dish'}
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
