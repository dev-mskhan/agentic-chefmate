export type UserRole = 'USER' | 'CHEF' | 'ADMIN'

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
