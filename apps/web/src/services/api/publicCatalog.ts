import chefs from '../mock/fixtures/chefs.json'
import dishes from '../mock/fixtures/dishes.json'
import mealPlans from '../mock/fixtures/mealPlans.json'
import reviews from '../mock/fixtures/reviews.json'

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
  status?: string
}

type Fixture = { id: string }

function paginate<T>(records: readonly T[], filters: PublicSearchFilters): ListResponse<T> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, filters.pageSize ?? 12)
  const start = (page - 1) * pageSize
  const data = records.slice(start, start + pageSize)
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))

  return {
    data: [...data],
    pageInfo: {
      page,
      pageSize,
      total: records.length,
      totalPages,
      hasNextPage: page < totalPages,
    },
  }
}

function search<T extends Fixture>(records: readonly T[], filters: PublicSearchFilters): T[] {
  const query = filters.query?.trim().toLowerCase()
  if (!query) return [...records]
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
}

export async function discoverChefs(filters: PublicSearchFilters = {}) {
  const records = search(chefs, filters).filter((chef) => {
    if (!filters.city) return true
    return chef.serviceArea.city.toLowerCase() === filters.city.toLowerCase()
  })
  return paginate(records, filters)
}

export async function discoverDishes(filters: PublicSearchFilters = {}) {
  const records = search(dishes, filters).filter((dish) => {
    if (!filters.category) return true
    return dish.category === filters.category
  })
  return paginate(records, filters)
}

export async function discoverMealPlans(filters: PublicSearchFilters = {}) {
  const records = search(mealPlans, filters).filter((plan) => {
    if (!filters.status) return true
    return plan.status === filters.status
  })
  return paginate(records, filters)
}

export async function getChefById(id: string) {
  return chefs.find((chef) => chef.id === id) ?? null
}

export async function getDishById(id: string) {
  return dishes.find((dish) => dish.id === id) ?? null
}

export async function getMealPlanById(id: string) {
  return mealPlans.find((plan) => plan.id === id) ?? null
}

export async function listReviewsByChefId(chefId: string) {
  return reviews.filter((review) => review.chefId === chefId && review.status === 'PUBLISHED')
}
