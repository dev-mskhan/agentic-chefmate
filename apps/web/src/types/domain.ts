export type UserRole = 'USER' | 'CHEF' | 'ADMIN'

export type RepositoryStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type SubscriptionFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELLED'
  | 'PAST_DUE'
  | 'COMPLETED'

export interface ChefProfile {
  id: string
  displayName: string
  slug: string
  bio: string
  specialties: string[]
  serviceArea: string
  rating: number
  reviewCount: number
  profileImageUrl: string
  accountState: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
}

export interface Dish {
  id: string
  chefId: string
  name: string
  description: string
  price: number
  currency: string
  ingredients: string[]
  dietaryTags: string[]
  allergens: string[]
  category: string
  media: { id: string; url: string; type: 'IMAGE' | 'VIDEO' }[]
  available: boolean
}

export interface Order {
  id: string
  customerId: string
  chefId: string
  status: OrderStatus
  deliveryDate: string
  total: number
  currency: string
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN'
export type NotificationType = 'ORDER' | 'PAYMENT' | 'MESSAGE' | 'SYSTEM'
export type LedgerEntryType = 'CREDIT' | 'DEBIT' | 'HOLD' | 'HOLD_RELEASE'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  avatarUrl?: string
}

export interface MealPlan {
  id: string
  chefId: string
  name: string
  description: string
  type: 'ONE_OFF' | 'SUBSCRIPTION'
  frequency?: SubscriptionFrequency
  price: number
  currency: string
  servings: number
  available: boolean
  media: { id: string; url: string; type: 'IMAGE' | 'VIDEO' }[]
}

export interface Subscription {
  id: string
  customerId: string
  chefId: string
  planId: string
  status: SubscriptionStatus
  frequency: SubscriptionFrequency
  priceSnapshot: number
  currency: string
  nextDeliveryDate: string
}

export interface Payment {
  id: string
  customerId: string
  orderId?: string
  amount: number
  currency: string
  status: PaymentStatus
  createdAt: string
}

export interface Review {
  id: string
  customerId: string
  chefId: string
  orderId: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  readAt?: string
  createdAt: string
}

export interface LedgerEntry {
  id: string
  chefId: string
  type: LedgerEntryType
  amount: number
  currency: string
  referenceId?: string
  createdAt: string
}

export interface AuthIdentity {
  userId: string
  email: string
  role: UserRole
}

export interface Address {
  id: string
  userId: string
  label: string
  line1: string
  city: string
  postalCode: string
  isDefault: boolean
}

export interface Favorite {
  id: string
  userId: string
  entityType: 'CHEF' | 'DISH' | 'MEAL_PLAN'
  entityId: string
  createdAt: string
}

export interface ChatThread {
  id: string
  customerId: string
  chefId: string
  subject: string
  unreadCount: number
  updatedAt: string
}

export interface ChatMessage {
  id: string
  threadId: string
  senderId: string
  body: string
  createdAt: string
  readAt?: string
}

export interface Payout {
  id: string
  chefId: string
  amount: number
  currency: string
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
  arrivalDate?: string
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  active: boolean
  expiresAt: string
}

export interface DashboardSummary {
  id: string
  ownerId: string
  role: UserRole
  period: '7D' | '30D' | '90D'
  orderCount: number
  grossAmount: number
  currency: string
  updatedAt: string
}

export interface ModerationCase {
  id: string
  entityType: 'CHEF' | 'USER' | 'DISH' | 'REVIEW'
  entityId: string
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
  reason: string
  createdAt: string
}

export interface DlqEntry {
  id: string
  eventType: string
  status: 'PENDING' | 'REPLAYED' | 'DISCARDED'
  attempts: number
  createdAt: string
}
