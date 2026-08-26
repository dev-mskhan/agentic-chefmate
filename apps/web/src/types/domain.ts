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
  userId: string
  displayName: string
  bio: string
  cuisineSpecialties: string[]
  verificationStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  accountState: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  serviceArea: { city: string; neighborhood: string; distanceKm?: number }
  portfolioMediaIds: string[]
  averageRating: number
  totalReviews: number
  profileImageUrl: string
}

export interface Dish {
  id: string
  chefId: string
  name: string
  description: string
  cuisine: string
  price: number
  currency: string
  ingredients: string[]
  dietaryTags: string[]
  allergens: string[]
  category: string
  occasionTags: string[]
  averageRating: number
  totalReviews: number
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  availability: { isAvailable: boolean; availableDays: string[] }
  media: { id: string; url: string; type: 'IMAGE' | 'VIDEO' }[]
}

export type MealPlanType = 'ONE_OFF' | 'SUBSCRIPTION'

export interface MealPlan {
  id: string
  chefId: string
  name: string
  description: string
  type: MealPlanType
  frequency: SubscriptionFrequency
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  tiers: { name: string; serves: string; price: number }[]
  basePrice: number
  currency: string
  availabilityRules: string[]
  pauseRules: string[]
  skipRules: string[]
  swapRules: string[]
  mediaIds: string[]
  averageRating: number
  totalReviews: number
}

export interface SearchRanking {
  textScore: number
  relevanceScore: number
  averageRating: number
  totalReviews: number
  distanceKm?: number
}

export interface ChefSearchResult extends SearchRanking {
  chefId: string
  displayName: string
  bio: string
  cuisineSpecialties: string[]
  serviceArea: ChefProfile['serviceArea']
  verificationStatus: ChefProfile['verificationStatus']
  accountState: ChefProfile['accountState']
}

export interface DishSearchResult extends SearchRanking {
  dishId: string
  chefId: string
  name: string
  description: string
  cuisine: string
  category: string
  price: number
  currency: string
  dietaryTags: string[]
  allergens: string[]
  occasionTags: string[]
  status: Dish['status']
  availability: Dish['availability']
}

export interface MealPlanSearchResult extends SearchRanking {
  planId: string
  chefId: string
  name: string
  description: string
  type: MealPlan['type']
  frequency: MealPlan['frequency']
  status: MealPlan['status']
  tiers: MealPlan['tiers']
  basePrice: number
  currency: string
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
