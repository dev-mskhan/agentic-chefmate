import chefDashboardFixture from '../mock/fixtures/chefDashboard.json'
import dishesFixture from '../mock/fixtures/dishes.json'
import mealPlansFixture from '../mock/fixtures/mealPlans.json'
import reviewsFixture from '../mock/fixtures/reviews.json'
import type { DishRecord, MealPlanRecord, ReviewRecord } from './publicCatalog'
import type { OrderStatus } from '../../types/domain'

export interface ChefOverviewMetrics {
  grossEarnings: number
  availableBalance: number
  pendingEarnings: number
  heldFunds: number
  activeOrdersCount: number
  completedOrdersCount: number
  dailyCapacity: number
  ordersToday: number
  revenueTimeline: Array<{ date: string; revenue: number; orders: number }>
}

export interface ChefIncomingOrder {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  status: OrderStatus
  deliveryDate: string
  items: Array<{ dishId: string; name: string; quantity: number; price: number }>
  total: number
  currency: string
  paymentMethod: 'STRIPE' | 'COD'
  paymentStatus: 'PAID' | 'AWAITING_CONFIRMATION' | 'COD_PENDING' | 'FAILED'
  customerNote?: string
  createdAt: string
}

export interface ChefScheduleData {
  weeklyDays: string[]
  dailyCapacity: number
  leadTimeHours: number
  blackoutDates: string[]
  deliveryHours: {
    lunch: string
    dinner: string
  }
}

export interface ChefLedgerItem {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'HOLD_RELEASE'
  description: string
  amount: number
  currency: string
  status: 'SETTLED' | 'COMPLETED' | 'RELEASED' | 'PENDING'
  createdAt: string
}

const CHEF_STORAGE_PREFIX = 'chefmate-chef-'

function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${CHEF_STORAGE_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${CHEF_STORAGE_PREFIX}${key}`, JSON.stringify(data))
  } catch {
    // ignore
  }
}

let chefMetrics: ChefOverviewMetrics = loadData('metrics', chefDashboardFixture.metrics as ChefOverviewMetrics)
let chefOrders: ChefIncomingOrder[] = loadData('orders', chefDashboardFixture.incomingOrders as unknown as ChefIncomingOrder[])
let chefDishes: DishRecord[] = loadData('dishes', dishesFixture.filter((d) => d.chefId === 'chef-ayesha-khan') as unknown as DishRecord[])
let chefPlans: MealPlanRecord[] = loadData('plans', mealPlansFixture.filter((p) => p.chefId === 'chef-ayesha-khan') as unknown as MealPlanRecord[])
let chefSchedule: ChefScheduleData = loadData('schedule', chefDashboardFixture.schedule as ChefScheduleData)
let chefLedger: ChefLedgerItem[] = loadData('ledger', chefDashboardFixture.ledger as unknown as ChefLedgerItem[])

export async function getChefOverview(): Promise<{
  profile: typeof chefDashboardFixture.profile
  metrics: ChefOverviewMetrics
  recentOrders: ChefIncomingOrder[]
}> {
  return Promise.resolve({
    profile: chefDashboardFixture.profile,
    metrics: chefMetrics,
    recentOrders: chefOrders,
  })
}

export async function getChefOrders(): Promise<ChefIncomingOrder[]> {
  return Promise.resolve([...chefOrders])
}

export async function updateChefOrderStatus(orderId: string, nextStatus: OrderStatus): Promise<boolean> {
  const idx = chefOrders.findIndex((o) => o.id === orderId)
  if (idx === -1) return Promise.resolve(false)

  chefOrders[idx] = { ...chefOrders[idx], status: nextStatus }
  saveData('orders', chefOrders)
  return Promise.resolve(true)
}

export async function getChefDishes(): Promise<DishRecord[]> {
  return Promise.resolve([...chefDishes])
}

export async function createChefDish(dish: Partial<DishRecord>): Promise<DishRecord> {
  const newDish: DishRecord = {
    id: `dish-${Date.now()}`,
    chefId: 'chef-ayesha-khan',
    name: dish.name || 'New Homemade Dish',
    description: dish.description || '',
    price: dish.price || 1500,
    currency: 'PKR',
    portionInfo: dish.portionInfo || 'Serves 2',
    cuisine: dish.cuisine || 'Punjabi',
    category: dish.category || 'Curry',
    dietaryTags: dish.dietaryTags || ['Halal'],
    allergens: dish.allergens || [],
    ingredients: dish.ingredients || [],
    mediaIds: dish.mediaIds || ['med-karahi-1'],
    status: 'ACTIVE',
    availability: {
      isAvailable: true,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableFrom: '11:00',
      availableUntil: '21:00',
    },
    averageRating: 5.0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as DishRecord

  chefDishes.push(newDish)
  saveData('dishes', chefDishes)
  return Promise.resolve(newDish)
}

export async function updateChefDish(dishId: string, updates: Partial<DishRecord>): Promise<DishRecord | null> {
  const idx = chefDishes.findIndex((d) => d.id === dishId)
  if (idx === -1) return Promise.resolve(null)

  chefDishes[idx] = { ...chefDishes[idx], ...updates, updatedAt: new Date().toISOString() }
  saveData('dishes', chefDishes)
  return Promise.resolve({ ...chefDishes[idx] })
}

export async function deleteChefDish(dishId: string): Promise<boolean> {
  chefDishes = chefDishes.filter((d) => d.id !== dishId)
  saveData('dishes', chefDishes)
  return Promise.resolve(true)
}

export async function getChefPlans(): Promise<MealPlanRecord[]> {
  return Promise.resolve([...chefPlans])
}

export async function createChefPlan(plan: Partial<MealPlanRecord>): Promise<MealPlanRecord> {
  const newPlan: MealPlanRecord = {
    id: `plan-${Date.now()}`,
    chefId: 'chef-ayesha-khan',
    name: plan.name || 'New Weekly Meal Plan',
    description: plan.description || '',
    type: 'SUBSCRIPTION',
    status: 'ACTIVE',
    frequency: 'WEEKLY',
    basePrice: plan.basePrice || 6000,
    currency: 'PKR',
    tiers: (plan.tiers as any) || [
      {
        name: 'Standard Tier',
        description: 'Perfect for daily family lunch & dinners',
        portionsPerDish: 2,
        dishIds: ['dish-smoky-karahi'],
        priceOverride: 6000,
        notes: 'Standard family portion size',
      },
    ],
    availabilityRules: {
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      maxSubscribers: 20,
    },
    pauseRules: { allowPause: true, maxPauseDays: 30 },
    skipRules: { allowSkip: true, minNoticeHours: 48 },
    swapRules: { allowSwap: true, swapWindowHours: 24 },
    mediaIds: ['med-karahi-1'],
    averageRating: 5.0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as MealPlanRecord

  chefPlans.push(newPlan)
  saveData('plans', chefPlans)
  return Promise.resolve(newPlan)
}

export async function getChefSchedule(): Promise<ChefScheduleData> {
  return Promise.resolve({ ...chefSchedule })
}

export async function updateChefSchedule(updates: Partial<ChefScheduleData>): Promise<ChefScheduleData> {
  chefSchedule = { ...chefSchedule, ...updates }
  saveData('schedule', chefSchedule)
  return Promise.resolve({ ...chefSchedule })
}

export async function getChefEarnings(): Promise<{
  availableBalance: number
  pendingEarnings: number
  heldFunds: number
  grossEarnings: number
  ledger: ChefLedgerItem[]
}> {
  return Promise.resolve({
    availableBalance: chefMetrics.availableBalance,
    pendingEarnings: chefMetrics.pendingEarnings,
    heldFunds: chefMetrics.heldFunds,
    grossEarnings: chefMetrics.grossEarnings,
    ledger: chefLedger,
  })
}

export async function requestPayout(amount: number): Promise<boolean> {
  if (amount > chefMetrics.availableBalance) return Promise.resolve(false)

  const newEntry: ChefLedgerItem = {
    id: `led-${Date.now()}`,
    type: 'DEBIT',
    description: 'Bank Payout Request',
    amount,
    currency: 'PKR',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  }

  chefMetrics.availableBalance -= amount
  chefLedger.unshift(newEntry)
  saveData('metrics', chefMetrics)
  saveData('ledger', chefLedger)
  return Promise.resolve(true)
}

export async function getChefReviews(): Promise<ReviewRecord[]> {
  return Promise.resolve(reviewsFixture as unknown as ReviewRecord[])
}
