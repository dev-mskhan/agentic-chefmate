import userProfileFixture from '../mock/fixtures/userProfile.json'
import ordersFixture from '../mock/fixtures/orders.json'
import subscriptionsFixture from '../mock/fixtures/subscriptions.json'
import notificationsFixture from '../mock/fixtures/notifications.json'
import type { OrderStatus } from '../../types/domain'

export interface UserAddress {
  id: string
  userId: string
  label: string
  line1: string
  area: string
  city: string
  postalCode: string
  isDefault: boolean
}

export interface UserProfileRecord {
  userId: string
  firstName: string
  lastName: string
  displayName: string
  phone?: string
  profileImage?: string
  dateOfBirth?: string
  addresses: UserAddress[]
  dietaryPreferences: string[]
  allergies: string[]
  dislikedIngredients: string[]
  spiceLevel: 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY'
  favoriteCuisines: string[]
  notificationPreferences: {
    channels: {
      inApp: boolean
      email: boolean
      push: boolean
    }
    categories: {
      orderUpdates: boolean
      promotions: boolean
      chefMessages: boolean
      systemAlerts: boolean
    }
  }
  favorites: {
    chefIds: string[]
    dishIds: string[]
    planIds: string[]
  }
  createdAt: string
  updatedAt: string
}

export interface OrderItemSnapshot {
  dishId: string
  name: string
  price: number
  quantity: number
  portionInfo?: string
  cuisine?: string
  dietaryTags?: string[]
  allergens?: string[]
  image?: string
}

export interface OrderPricing {
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  currency: string
  couponCode?: string
}

export interface OrderRecord {
  id: string
  customerId: string
  chefId: string
  chefName: string
  status: OrderStatus
  orderType: 'ONE_OFF' | 'SUBSCRIPTION'
  deliveryDate: string
  deliveryAddress: UserAddress
  items: OrderItemSnapshot[]
  pricing: OrderPricing
  paymentMethod: 'STRIPE' | 'COD'
  paymentStatus: 'PAID' | 'AWAITING_CONFIRMATION' | 'COD_PENDING' | 'FAILED'
  customerNote?: string
  cancellation?: {
    reason: string
    cancelledBy: string
    cancelledAt: string
  }
  review?: {
    id: string
    rating: number
    tasteRating?: number
    packagingRating?: number
    deliveryRating?: number
    comment: string
    createdAt: string
  }
  dispute?: {
    id: string
    reason: string
    notes: string
    status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED'
    requestedAt: string
  }
  createdAt: string
  updatedAt: string
}

export interface SubscriptionRecord {
  id: string
  customerId: string
  chefId: string
  chefName: string
  planId: string
  planName: string
  tierName: string
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE' | 'COMPLETED'
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  basePrice: number
  currency: string
  selectedDishes: Array<{
    dishId: string
    name: string
    quantity: number
  }>
  deliveryAddress: UserAddress
  schedule: {
    deliveryDays: string[]
    nextDeliveryDate: string
    nextBillingDate: string
  }
  currentPeriod: {
    start: string
    end: string
  }
  pauseRules: {
    allowPause: boolean
    maxPauseDays?: number
  }
  skipRules: {
    allowSkip: boolean
    minNoticeHours?: number
  }
  swapRules: {
    allowSwap: boolean
    swapWindowHours?: number
  }
  pausedAt?: string
  pauseExpiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  category: string
  title: string
  message: string
  data?: Record<string, unknown>
  readAt?: string | null
  createdAt: string
}

// In-memory state initialized from fixtures with local storage persistence
const PROFILE_STORAGE_KEY = 'chefmate-user-profile'
const ORDERS_STORAGE_KEY = 'chefmate-user-orders'
const SUBS_STORAGE_KEY = 'chefmate-user-subs'
const NOTIFS_STORAGE_KEY = 'chefmate-user-notifs'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore storage quota errors in test environments
  }
}

let activeProfile: UserProfileRecord = loadFromStorage(
  PROFILE_STORAGE_KEY,
  userProfileFixture as unknown as UserProfileRecord,
)

let activeOrders: OrderRecord[] = loadFromStorage(
  ORDERS_STORAGE_KEY,
  ordersFixture as unknown as OrderRecord[],
)

let activeSubscriptions: SubscriptionRecord[] = loadFromStorage(
  SUBS_STORAGE_KEY,
  subscriptionsFixture as unknown as SubscriptionRecord[],
)

let activeNotifications: NotificationRecord[] = loadFromStorage(
  NOTIFS_STORAGE_KEY,
  notificationsFixture as unknown as NotificationRecord[],
)

export async function getUserProfile(): Promise<UserProfileRecord> {
  return Promise.resolve({ ...activeProfile })
}

export async function updateUserProfile(
  updates: Partial<UserProfileRecord>,
): Promise<UserProfileRecord> {
  activeProfile = {
    ...activeProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(PROFILE_STORAGE_KEY, activeProfile)
  return Promise.resolve({ ...activeProfile })
}

export async function getUserOrders(): Promise<OrderRecord[]> {
  return Promise.resolve([...activeOrders])
}

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const match = activeOrders.find((o) => o.id === orderId)
  return Promise.resolve(match ? { ...match } : null)
}

export async function cancelOrder(orderId: string, reason: string): Promise<boolean> {
  const idx = activeOrders.findIndex((o) => o.id === orderId)
  if (idx === -1) return Promise.resolve(false)

  activeOrders[idx] = {
    ...activeOrders[idx],
    status: 'CANCELLED',
    cancellation: {
      reason,
      cancelledBy: 'CUSTOMER',
      cancelledAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(ORDERS_STORAGE_KEY, activeOrders)
  return Promise.resolve(true)
}

export async function submitOrderReview(
  orderId: string,
  reviewData: {
    rating: number
    tasteRating?: number
    packagingRating?: number
    deliveryRating?: number
    comment: string
  },
): Promise<boolean> {
  const idx = activeOrders.findIndex((o) => o.id === orderId)
  if (idx === -1) return Promise.resolve(false)

  activeOrders[idx] = {
    ...activeOrders[idx],
    review: {
      id: `rev-${Date.now()}`,
      ...reviewData,
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(ORDERS_STORAGE_KEY, activeOrders)
  return Promise.resolve(true)
}

export async function submitOrderDispute(
  orderId: string,
  disputeData: {
    reason: string
    notes: string
  },
): Promise<boolean> {
  const idx = activeOrders.findIndex((o) => o.id === orderId)
  if (idx === -1) return Promise.resolve(false)

  activeOrders[idx] = {
    ...activeOrders[idx],
    dispute: {
      id: `disp-${Date.now()}`,
      ...disputeData,
      status: 'OPEN',
      requestedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(ORDERS_STORAGE_KEY, activeOrders)
  return Promise.resolve(true)
}

export async function getUserSubscriptions(): Promise<SubscriptionRecord[]> {
  return Promise.resolve([...activeSubscriptions])
}

export async function updateSubscriptionStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
): Promise<boolean> {
  const idx = activeSubscriptions.findIndex((s) => s.id === id)
  if (idx === -1) return Promise.resolve(false)

  activeSubscriptions[idx] = {
    ...activeSubscriptions[idx],
    status,
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(SUBS_STORAGE_KEY, activeSubscriptions)
  return Promise.resolve(true)
}

export async function getUserNotifications(): Promise<NotificationRecord[]> {
  return Promise.resolve([...activeNotifications])
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const notif = activeNotifications.find((n) => n.id === id)
  if (!notif) return Promise.resolve(false)
  notif.readAt = new Date().toISOString()
  saveToStorage(NOTIFS_STORAGE_KEY, activeNotifications)
  return Promise.resolve(true)
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const now = new Date().toISOString()
  activeNotifications.forEach((n) => {
    n.readAt = now
  })
  saveToStorage(NOTIFS_STORAGE_KEY, activeNotifications)
  return Promise.resolve(true)
}
