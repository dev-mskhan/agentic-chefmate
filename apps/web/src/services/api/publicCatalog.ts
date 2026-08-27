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
  await wait()
  if (filters.query === '__error') throw new Error('Catalog unavailable')
  const records = search(chefs, filters).filter((chef) => matchesChef(chef.id, filters))
  return paginate(records, filters)
}

export async function discoverDishes(filters: PublicSearchFilters = {}): Promise<ListResponse<DishRecord>> {
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
  await wait(120)
  return chefs.find((chef) => chef.id === id) ?? null
}

export async function getDishById(id: string): Promise<DishRecord | null> {
  await wait(120)
  return dishes.find((dish) => dish.id === id) ?? null
}

export async function getMealPlanById(id: string): Promise<MealPlanRecord | null> {
  await wait(120)
  return mealPlans.find((plan) => plan.id === id) ?? null
}

export async function listReviewsByTargetId(targetId: string, target: 'chef' | 'dish' | 'plan' = 'chef'): Promise<ReviewRecord[]> {
  await wait(120)
  return reviews.filter((review) => {
    if (review.status !== 'PUBLISHED') return false
    if (target === 'dish') return review.dishId === targetId
    if (target === 'plan') return (review as { planId?: string }).planId === targetId
    return review.chefId === targetId
  })
}

export async function listReviewsByChefId(chefId: string): Promise<ReviewRecord[]> {
  return listReviewsByTargetId(chefId, 'chef')
}

export async function listAddresses(): Promise<AddressRecord[]> {
  await wait(120)
  return [...addresses]
}

export async function getMediaByIds(ids: readonly string[]): Promise<MediaRecord[]> {
  await wait(80)
  return media.filter((item) => ids.includes(item.id))
}

export async function validateCoupon(code: string, subtotal: number, chefId: string): Promise<{ couponCode: string; discountAmount: number }> {
  await wait(160)
  const coupon = coupons.find((item) => item.code === code.trim().toUpperCase() && item.isActive && (!item.chefId || item.chefId === chefId))
  if (!coupon) throw new Error('Enter a valid coupon code for this chef.')
  if (subtotal < coupon.minOrderAmount) throw new Error(`This coupon needs an order of at least ${coupon.minOrderAmount.toLocaleString()} PKR.`)
  const discountAmount = coupon.discountType === 'PERCENTAGE'
    ? Math.min(Math.round(subtotal * coupon.discountValue) / 100, coupon.maxDiscountAmount ?? subtotal)
    : Math.min(coupon.discountValue, subtotal)
  return { couponCode: coupon.code, discountAmount }
}

export async function checkoutPreview(input: CartInput): Promise<CheckoutPreview> {
  await wait(220)
  const chef = chefs.find((item) => item.id === input.chefId)
  if (!chef || chef.accountState !== 'ACTIVE') throw new Error('This chef is not available for orders.')
  const selected = input.items.map((item) => dishes.find((dish) => dish.id === item.dishId && dish.chefId === input.chefId && dish.status === 'ACTIVE'))
  if (selected.some((dish) => !dish)) throw new Error('One dish is no longer available. Return to the menu and choose another dish.')
  const weekdayCodes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const deliveryDay = weekdayCodes[new Date(`${input.deliveryDate}T12:00:00`).getDay()]
  if (selected.some((dish) => dish && !dish.availability.availableDays.includes(deliveryDay))) throw new Error('The chef is not available on the selected date. Choose another date.')
  const subtotal = input.items.reduce((sum, item, index) => sum + (selected[index]?.price ?? 0) * item.quantity, 0)
  const coupon = input.couponCode ? await validateCoupon(input.couponCode, subtotal, input.chefId) : undefined
  const deliveryFee = 250
  return {
    subtotal,
    deliveryFee,
    discountAmount: coupon?.discountAmount ?? 0,
    total: subtotal + deliveryFee - (coupon?.discountAmount ?? 0),
    currency: 'PKR',
    couponCode: coupon?.couponCode,
  }
}

export async function submitCheckout(input: CartInput, idempotencyKey: string): Promise<CheckoutResult> {
  await wait(260)
  const preview = await checkoutPreview(input)
  return {
    order: {
      id: `order-${idempotencyKey.slice(-8)}`,
      chefId: input.chefId,
      deliveryDate: input.deliveryDate,
      addressId: input.addressId,
      total: preview.total,
      currency: preview.currency,
    },
    paymentId: `payment-${idempotencyKey.slice(-8)}`,
    clientSecret: `client_secret_${idempotencyKey}`,
  }
}
