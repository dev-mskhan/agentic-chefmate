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
  quantity: number
  price: number
  image?: string
  cuisine?: string
  portionInfo?: string
}

export interface OrderRecord {
  id: string
  chefId: string
  chefName: string
  customerId: string
  customerName: string
  status: OrderStatus
  deliveryDate: string
  deliveryAddress: {
    label: string
    line1: string
    area: string
    city: string
    postalCode: string
  }
  items: OrderItemSnapshot[]
  pricing: {
    subtotal: number
    deliveryFee: number
    discountAmount: number
    total: number
    currency: string
    couponCode?: string
  }
  paymentMethod: 'STRIPE' | 'COD'
  paymentStatus: 'PAID' | 'PENDING' | 'COD_PENDING' | 'FAILED' | 'REFUNDED'
  customerNote?: string
  cancellation?: {
    reason: string
    cancelledBy: 'CUSTOMER' | 'CHEF' | 'ADMIN'
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
    status: string
    requestedAt: string
  }
  createdAt: string
  updatedAt: string
}

export interface SubscriptionRecord {
  id: string
  planId: string
  planTitle: string
  chefId: string
  chefName: string
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  frequency: 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM'
  deliveryDays: string[]
  portionCount: number
  tier: 'STANDARD' | 'PREMIUM' | 'FAMILY'
  currentCycle: {
    startDate: string
    endDate: string
    deliveryDates: string[]
  }
  nextDeliveryDate: string
  paymentMethod: {
    type: 'CARD' | 'COD'
    last4?: string
    brand?: string
  }
  pricing: {
    basePrice: number
    discountAmount: number
    deliveryFee: number
    totalPerCycle: number
    currency: string
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

const isLive = () => import.meta.env.VITE_USE_MOCK === 'false'

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
    // Ignore storage quota errors
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
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/user-dashboard/profile', { credentials: 'include' })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // fallback
    }
  }
  return Promise.resolve({ ...activeProfile })
}

export async function updateUserProfile(
  updates: Partial<UserProfileRecord>,
): Promise<UserProfileRecord> {
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/user-dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // fallback
    }
  }
  activeProfile = {
    ...activeProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveToStorage(PROFILE_STORAGE_KEY, activeProfile)
  return Promise.resolve({ ...activeProfile })
}

export async function getUserOrders(): Promise<OrderRecord[]> {
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/user-dashboard/orders', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.orders || data
      }
    } catch {
      // fallback
    }
  }
  return Promise.resolve([...activeOrders])
}

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/user-dashboard/orders/${orderId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.order || data
      }
    } catch {
      // fallback
    }
  }
  const match = activeOrders.find((o) => o.id === orderId)
  return Promise.resolve(match ? { ...match } : null)
}

export async function cancelOrder(orderId: string, reason: string): Promise<boolean> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })
      return res.ok
    } catch {
      // fallback
    }
  }
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
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId, ...reviewData }),
      })
      return res.ok
    } catch {
      // fallback
    }
  }
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
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId, ...disputeData }),
      })
      return res.ok
    } catch {
      // fallback
    }
  }
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
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/user-dashboard/subscriptions', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.subscriptions || data
      }
    } catch {
      // fallback
    }
  }
  return Promise.resolve([...activeSubscriptions])
}

export async function updateSubscriptionStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
): Promise<boolean> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/subscriptions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      return res.ok
    } catch {
      // fallback
    }
  }
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
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/notifications', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.notifications || data
      }
    } catch {
      // fallback
    }
  }
  return Promise.resolve([...activeNotifications])
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (isLive()) {
    try {
      const res = await fetch('/api/v1/notifications/unread-count', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.count ?? 0
      }
    } catch {
      // fallback
    }
  }
  const count = activeNotifications.filter((n) => !n.readAt).length
  return Promise.resolve(count)
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (isLive()) {
    try {
      const res = await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
      return res.ok
    } catch {
      // fallback
    }
  }
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
