import chefs from '../mock/fixtures/chefs.json'
import dishes from '../mock/fixtures/dishes.json'
import mealPlans from '../mock/fixtures/mealPlans.json'
import reviews from '../mock/fixtures/reviews.json'
import addresses from '../mock/fixtures/addresses.json'
import coupons from '../mock/fixtures/coupons.json'
import media from '../mock/fixtures/media.json'

export interface PageInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

export interface ListResponse<T> {
  data: T[]
  pageInfo: PageInfo
}

export interface PublicSearchFilters {
  query?: string
  page?: number
  pageSize?: number
  city?: string
  category?: string
  cuisine?: string
  dietaryTag?: string
  occasion?: string
  excludeAllergen?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  availableDay?: string
  chefId?: string
  planType?: string
  frequency?: string
  status?: string
  type?: 'chefs' | 'dishes' | 'meal-plans'
}

export type ChefRecord = (typeof chefs)[number]
export type DishRecord = (typeof dishes)[number]
export type MealPlanRecord = (typeof mealPlans)[number]
export type ReviewRecord = (typeof reviews)[number]
export type AddressRecord = (typeof addresses)[number]
export type CouponRecord = (typeof coupons)[number]
export type MediaRecord = (typeof media)[number]

export interface CartInput {
  chefId: string
  items: Array<{ dishId: string; quantity: number }>
  deliveryDate: string
  addressId: string
  couponCode?: string
}

export interface CheckoutPreview {
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  currency: string
  couponCode?: string
}

export interface CheckoutResult {
  order: {
    id: string
    chefId: string
    deliveryDate: string
    addressId: string
    total: number
    currency: string
  }
  paymentId: string
  clientSecret: string
}

const isLive = () => import.meta.env.VITE_USE_MOCK === 'false'
const wait = (milliseconds = 180) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function paginate<T>(records: readonly T[], filters: PublicSearchFilters): ListResponse<T> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, Math.min(24, filters.pageSize ?? 6))
  const start = (page - 1) * pageSize
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))

  return {
    data: [...records.slice(start, start + pageSize)],
    pageInfo: {
      page,
      pageSize,
      total: records.length,
      totalPages,
      hasNextPage: page < totalPages,
    },
  }
}

function search<T>(records: readonly T[], filters: PublicSearchFilters): T[] {
  const query = filters.query?.trim().toLowerCase()
  if (!query) return [...records]
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
}

function chefFor(chefId: string) {
  return chefs.find((chef) => chef.id === chefId)
}

function filterValues(value?: string) {
  return value?.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean) ?? []
}

function includesFilter(values: readonly string[], filter?: string) {
  const selected = filterValues(filter)
  return selected.length === 0 || selected.some((item) => values.some((value) => value.toLowerCase() === item))
}

function matchesChef(chefId: string, filters: PublicSearchFilters) {
  const chef = chefFor(chefId)
  if (!chef || chef.accountState !== 'ACTIVE') return false
  if (filters.city && chef.serviceArea.city.toLowerCase() !== filters.city.toLowerCase()) return false
  if (filters.chefId && chef.id !== filters.chefId) return false
  if (!includesFilter(chef.cuisineSpecialties, filters.cuisine)) return false
  if (filters.minRating !== undefined && chef.averageRating < filters.minRating) return false
  return true
}

export async function discoverChefs(filters: PublicSearchFilters = {}): Promise<ListResponse<ChefRecord>> {
  if (isLive()) {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.cuisine) params.set('cuisine', filters.cuisine)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

    try {
      const res = await fetch(`/api/v1/chefs?${params.toString()}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {
      // fallback to mock on network error
    }
  }

  await wait()
  if (filters.query === '__error') throw new Error('Catalog unavailable')
  const records = search(chefs, filters).filter((chef) => matchesChef(chef.id, filters))
  return paginate(records, filters)
}

export async function discoverDishes(filters: PublicSearchFilters = {}): Promise<ListResponse<DishRecord>> {
  if (isLive()) {
    const params = new URLSearchParams()
    if (filters.chefId) params.set('chefId', filters.chefId)
    if (filters.category) params.set('category', filters.category)
    if (filters.cuisine) params.set('cuisine', filters.cuisine)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

    try {
      const res = await fetch(`/api/v1/chefs/dishes?${params.toString()}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {
      // fallback to mock on network error
    }
  }

  await wait()
  if (filters.query === '__error') throw new Error('Catalog unavailable')
  const records = search(dishes, filters).filter((dish) => {
    if (!matchesChef(dish.chefId, filters)) return false
    if (filters.category && dish.category !== filters.category) return false
    if (!includesFilter(dish.dietaryTags as readonly string[], filters.dietaryTag)) return false
    if (!includesFilter(dish.occasionTags as readonly string[], filters.occasion)) return false
    if (filters.excludeAllergen && (dish.allergens as readonly string[]).includes(filters.excludeAllergen)) return false
    if (filters.minPrice !== undefined && dish.price < filters.minPrice) return false
    if (filters.maxPrice !== undefined && dish.price > filters.maxPrice) return false
    if (filters.minRating !== undefined && dish.averageRating < filters.minRating) return false
    if (!includesFilter(dish.availability.availableDays as readonly string[], filters.availableDay)) return false
    if (filters.status && dish.status !== filters.status) return false
    return dish.status === 'ACTIVE'
  })
  return paginate(records, filters)
}

export async function discoverMealPlans(filters: PublicSearchFilters = {}): Promise<ListResponse<MealPlanRecord>> {
  if (isLive()) {
    const params = new URLSearchParams()
    if (filters.chefId) params.set('chefId', filters.chefId)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize))

    try {
      const res = await fetch(`/api/v1/chefs/meal-plans?${params.toString()}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {
      // fallback to mock on network error
    }
  }

  await wait()
  if (filters.query === '__error') throw new Error('Catalog unavailable')
  const records = search(mealPlans, filters).filter((plan) => {
    if (!matchesChef(plan.chefId, filters)) return false
    if (filters.planType && plan.type !== filters.planType) return false
    if (filters.frequency && plan.frequency !== filters.frequency) return false
    if (filters.minPrice !== undefined && plan.basePrice < filters.minPrice) return false
    if (filters.maxPrice !== undefined && plan.basePrice > filters.maxPrice) return false
    if (filters.minRating !== undefined && plan.averageRating < filters.minRating) return false
    if (!includesFilter(plan.availabilityRules.availableDays as readonly string[], filters.availableDay)) return false
    if (filters.status && plan.status !== filters.status) return false
    return plan.status === 'ACTIVE'
  })
  return paginate(records, filters)
}

export async function getChefById(id: string): Promise<ChefRecord | null> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/chefs/${id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.chef || data
      }
    } catch {
      // fallback
    }
  }
  await wait(120)
  return chefs.find((chef) => chef.id === id) ?? null
}

export async function getDishById(id: string): Promise<DishRecord | null> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/chefs/dishes/${id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.dish || data
      }
    } catch {
      // fallback
    }
  }
  await wait(120)
  return dishes.find((dish) => dish.id === id) ?? null
}

export async function getMealPlanById(id: string): Promise<MealPlanRecord | null> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/chefs/meal-plans/${id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.mealPlan || data
      }
    } catch {
      // fallback
    }
  }
  await wait(120)
  return mealPlans.find((plan) => plan.id === id) ?? null
}

export async function getMediaByIds(ids: readonly string[]): Promise<MediaRecord[]> {
  await wait(80)
  return media.filter((item) => ids.includes(item.id))
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponRecord | null> {
  await wait(150)
  const coupon = coupons.find((item) => item.code.toLowerCase() === code.trim().toLowerCase())
  if (!coupon) return null
  if (subtotal < coupon.minOrderValue) return null
  return coupon
}

export async function checkoutPreview(input: CartInput): Promise<CheckoutPreview> {
  await wait(220)
  const chef = chefs.find((item) => item.id === input.chefId)
  if (!chef || chef.accountState !== 'ACTIVE') {
    throw new Error('Chef is not currently accepting orders.')
  }

  const selected = input.items.map((item) => {
    const dish = dishes.find((entry) => entry.id === item.dishId)
    if (!dish || dish.chefId !== input.chefId || dish.status !== 'ACTIVE') {
      throw new Error('One or more dishes are no longer available.')
    }

    const weekdayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
    const deliveryDay = weekdayCodes[new Date(input.deliveryDate).getDay()]
    if (!dish.availability.availableDays.includes(deliveryDay)) {
      throw new Error(`"${dish.name}" is not prepared on the selected delivery day.`)
    }

    return { dish, quantity: item.quantity }
  })

  const subtotal = selected.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const coupon = input.couponCode ? await validateCoupon(input.couponCode, subtotal) : null
  const deliveryFee = 250
  const discountAmount = coupon ? Math.min(coupon.maxDiscount ?? 0, Math.round((subtotal * coupon.discountValue) / 100)) : 0
  const total = Math.max(0, subtotal + deliveryFee - discountAmount)

  return {
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    currency: 'PKR',
    couponCode: coupon?.code,
  }
}

export async function submitCheckout(input: CartInput, idempotencyKey: string): Promise<CheckoutResult> {
  if (isLive()) {
    const res = await fetch('/api/v1/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKey,
        'x-request-id': crypto.randomUUID(),
      },
      credentials: 'include',
      body: JSON.stringify({
        chefId: input.chefId,
        items: input.items,
        deliveryDate: input.deliveryDate,
        addressId: input.addressId,
        couponCode: input.couponCode,
        idempotencyKey,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Checkout failed' }))
      throw new Error(err.message || 'Checkout failed')
    }

    const data = await res.json()
    return {
      order: {
        id: data.order._id || data.order.id,
        chefId: data.order.chefId,
        deliveryDate: data.order.deliveryDate,
        addressId: data.order.deliveryAddress?.addressId || input.addressId,
        total: data.order.pricing?.total || 0,
        currency: data.order.pricing?.currency || 'PKR',
      },
      paymentId: data.paymentId,
      clientSecret: data.clientSecret,
    }
  }

  const preview = await checkoutPreview(input)
  return {
    order: {
      id: `ord-${idempotencyKey.slice(0, 8)}`,
      chefId: input.chefId,
      deliveryDate: input.deliveryDate,
      addressId: input.addressId,
      total: preview.total,
      currency: preview.currency,
    },
    paymentId: `pay-${idempotencyKey.slice(0, 8)}`,
    clientSecret: `pi_mock_${idempotencyKey.slice(0, 16)}_secret`,
  }
}
