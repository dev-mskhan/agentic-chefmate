import type { ChefProfile, Dish, Order } from '../types/domain'

export const mockChefs: ChefProfile[] = [
  {
    id: 'chef-ayesha-khan',
    displayName: 'Ayesha Khan',
    slug: 'ayesha-khan',
    bio: 'Punjabi home cooking with a generous table and seasonal ingredients.',
    specialties: ['Punjabi', 'Home cooking'],
    serviceArea: 'Lahore',
    rating: 4.9,
    reviewCount: 128,
    profileImageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80',
    accountState: 'ACTIVE',
  },
  {
    id: 'chef-hamza-malik',
    displayName: 'Hamza Malik',
    slug: 'hamza-malik',
    bio: 'Coastal flavours, charcoal cooking, and Karachi-inspired comfort food.',
    specialties: ['Coastal', 'Pakistani'],
    serviceArea: 'Karachi',
    rating: 4.8,
    reviewCount: 94,
    profileImageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80',
    accountState: 'ACTIVE',
  },
]

export const mockDishes: Dish[] = [
  {
    id: 'dish-smoky-karahi',
    chefId: 'chef-ayesha-khan',
    name: 'Smoky karahi',
    description: 'A slow-built tomato karahi finished with green chilli and coriander.',
    price: 2400,
    currency: 'PKR',
    ingredients: ['Chicken', 'Tomato', 'Green chilli', 'Coriander'],
    dietaryTags: ['Halal'],
    allergens: [],
    category: 'Main course',
    media: [{ id: 'media-smoky-karahi', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', type: 'IMAGE' }],
    available: true,
  },
]

export const mockOrders: Order[] = [
  {
    id: 'order-demo-001',
    customerId: 'customer-demo',
    chefId: 'chef-ayesha-khan',
    status: 'CONFIRMED',
    deliveryDate: '2026-08-29',
    total: 2400,
    currency: 'PKR',
  },
]

export function createMockRepository<T extends { id: string }>(records: readonly T[]) {
  return {
    async list(): Promise<T[]> {
      return records.map((record) => ({ ...record }))
    },
    async getById(id: string): Promise<T | null> {
      const record = records.find((item) => item.id === id)
      return record ? { ...record } : null
    },
  }
}

export const mockRepositories = {
  chefs: createMockRepository(mockChefs),
  dishes: createMockRepository(mockDishes),
  orders: createMockRepository(mockOrders),
}
