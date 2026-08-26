import type {
  Address,
  AuthIdentity,
  ChatMessage,
  ChatThread,
  ChefProfile,
  Coupon,
  DashboardSummary,
  Dish,
  DlqEntry,
  Favorite,
  LedgerEntry,
  MealPlan,
  ModerationCase,
  Notification,
  Order,
  Payment,
  Payout,
  RepositoryStatus,
  Review,
  Subscription,
  UserProfile,
} from '../types/domain'

export interface PageRequest {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface MockRepositorySnapshot {
  status: RepositoryStatus
  error: string | null
}

export class MockRepositoryError extends Error {
  readonly code = 'MOCK_REPOSITORY_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'MockRepositoryError'
  }
}

export type MockRepositoryMode = 'success' | 'empty' | 'error'

interface MockRepositoryOptions {
  name?: string
  mode?: MockRepositoryMode
  delayMs?: number
  errorMessage?: string
}

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

export const mockUsers: UserProfile[] = [
  { id: 'customer-demo', email: 'hello@chefmate.test', firstName: 'Mariam', lastName: 'Khan', role: 'USER' },
  { id: 'chef-ayesha-khan', email: 'ayesha@chefmate.test', firstName: 'Ayesha', lastName: 'Khan', role: 'CHEF' },
  { id: 'admin-demo', email: 'ops@chefmate.test', firstName: 'Nadia', lastName: 'Raza', role: 'ADMIN' },
]

export const mockAuthIdentities: AuthIdentity[] = [
  { userId: 'customer-demo', email: 'hello@chefmate.test', role: 'USER' },
  { userId: 'chef-ayesha-khan', email: 'ayesha@chefmate.test', role: 'CHEF' },
  { userId: 'admin-demo', email: 'ops@chefmate.test', role: 'ADMIN' },
]

export const mockMealPlans: MealPlan[] = [
  {
    id: 'plan-sunday-dastarkhwan',
    chefId: 'chef-ayesha-khan',
    name: 'The Sunday Dastarkhwan',
    description: 'A generous weekly menu for a table of four.',
    type: 'SUBSCRIPTION',
    frequency: 'WEEKLY',
    price: 8400,
    currency: 'PKR',
    servings: 4,
    available: true,
    media: [{ id: 'media-sunday-plan', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', type: 'IMAGE' }],
  },
]

export const mockSubscriptions: Subscription[] = [
  { id: 'subscription-demo-001', customerId: 'customer-demo', chefId: 'chef-ayesha-khan', planId: 'plan-sunday-dastarkhwan', status: 'ACTIVE', frequency: 'WEEKLY', priceSnapshot: 8400, currency: 'PKR', nextDeliveryDate: '2026-09-06' },
]

export const mockPayments: Payment[] = [
  { id: 'payment-demo-001', customerId: 'customer-demo', orderId: 'order-demo-001', amount: 2400, currency: 'PKR', status: 'SUCCEEDED', createdAt: '2026-08-24T12:00:00.000Z' },
]

export const mockReviews: Review[] = [
  { id: 'review-demo-001', customerId: 'customer-demo', chefId: 'chef-ayesha-khan', orderId: 'order-demo-001', rating: 5, comment: 'The karahi tasted like a Sunday at home.', status: 'PUBLISHED', createdAt: '2026-08-25T10:00:00.000Z' },
]

export const mockNotifications: Notification[] = [
  { id: 'notification-demo-001', userId: 'customer-demo', type: 'ORDER', title: 'Your order is confirmed', body: 'Ayesha is preparing your smoky karahi.', createdAt: '2026-08-24T12:05:00.000Z' },
]

export const mockLedgerEntries: LedgerEntry[] = [
  { id: 'ledger-demo-001', chefId: 'chef-ayesha-khan', type: 'CREDIT', amount: 2400, currency: 'PKR', referenceId: 'order-demo-001', createdAt: '2026-08-24T12:00:00.000Z' },
  { id: 'ledger-demo-002', chefId: 'chef-ayesha-khan', type: 'HOLD', amount: 240, currency: 'PKR', referenceId: 'order-demo-001', createdAt: '2026-08-24T12:00:00.000Z' },
]

export const mockAddresses: Address[] = [
  { id: 'address-demo-home', userId: 'customer-demo', label: 'Home', line1: '18 Garden Lane', city: 'Lahore', postalCode: '54000', isDefault: true },
]

export const mockFavorites: Favorite[] = [
  { id: 'favorite-demo-chef', userId: 'customer-demo', entityType: 'CHEF', entityId: 'chef-ayesha-khan', createdAt: '2026-08-20T10:00:00.000Z' },
]

export const mockChatThreads: ChatThread[] = [
  { id: 'thread-demo-ayesha', customerId: 'customer-demo', chefId: 'chef-ayesha-khan', subject: 'Order details', unreadCount: 1, updatedAt: '2026-08-24T12:10:00.000Z' },
]

export const mockChatMessages: ChatMessage[] = [
  { id: 'message-demo-ayesha', threadId: 'thread-demo-ayesha', senderId: 'chef-ayesha-khan', body: 'I will have your karahi ready for Saturday.', createdAt: '2026-08-24T12:10:00.000Z' },
]

export const mockPayouts: Payout[] = [
  { id: 'payout-demo-001', chefId: 'chef-ayesha-khan', amount: 2160, currency: 'PKR', status: 'PENDING', arrivalDate: '2026-08-31', createdAt: '2026-08-24T12:00:00.000Z' },
]

export const mockCoupons: Coupon[] = [
  { id: 'coupon-welcome-10', code: 'WELCOME10', type: 'PERCENTAGE', value: 10, active: true, expiresAt: '2026-12-31T23:59:59.000Z' },
]

export const mockDashboardSummaries: DashboardSummary[] = [
  { id: 'dashboard-customer-30d', ownerId: 'customer-demo', role: 'USER', period: '30D', orderCount: 3, grossAmount: 7200, currency: 'PKR', updatedAt: '2026-08-25T10:00:00.000Z' },
  { id: 'dashboard-chef-30d', ownerId: 'chef-ayesha-khan', role: 'CHEF', period: '30D', orderCount: 18, grossAmount: 43200, currency: 'PKR', updatedAt: '2026-08-25T10:00:00.000Z' },
]

export const mockModerationCases: ModerationCase[] = [
  { id: 'moderation-demo-001', entityType: 'CHEF', entityId: 'chef-hamza-malik', status: 'IN_REVIEW', reason: 'Verification documents require review.', createdAt: '2026-08-23T09:00:00.000Z' },
]

export const mockDlqEntries: DlqEntry[] = [
  { id: 'dlq-demo-001', eventType: 'order.status.changed', status: 'PENDING', attempts: 2, createdAt: '2026-08-25T08:30:00.000Z' },
]

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

const wait = (delayMs: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs))

export function createMockRepository<T extends { id: string }>(records: readonly T[], options: MockRepositoryOptions = {}) {
  let mode: MockRepositoryMode = options.mode ?? 'success'
  let snapshot: MockRepositorySnapshot = { status: 'idle', error: null }
  const repositoryName = options.name ?? 'mock repository'
  const delayMs = Math.max(0, options.delayMs ?? 0)

  const request = async <R>(operation: () => R): Promise<R> => {
    snapshot = { status: 'loading', error: null }
    if (delayMs > 0) await wait(delayMs)
    if (mode === 'error') {
      const message = options.errorMessage ?? `${repositoryName} is unavailable.`
      snapshot = { status: 'error', error: message }
      throw new MockRepositoryError(message)
    }
    const result = operation()
    snapshot = { status: mode === 'empty' ? 'empty' : 'success', error: null }
    return result
  }

  const getRecords = () => (mode === 'empty' ? [] : records.map(clone))

  return {
    async list(): Promise<T[]> {
      return request(() => getRecords())
    },
    async listPage({ page = 1, pageSize = 10 }: PageRequest = {}): Promise<PaginatedResult<T>> {
      return request(() => {
        const safePageSize = Math.max(1, Math.floor(pageSize))
        const safePage = Math.max(1, Math.floor(page))
        const allRecords = getRecords()
        const total = allRecords.length
        const totalPages = Math.max(1, Math.ceil(total / safePageSize))
        const currentPage = Math.min(safePage, totalPages)
        const start = (currentPage - 1) * safePageSize
        const items = allRecords.slice(start, start + safePageSize)
        return {
          items,
          page: currentPage,
          pageSize: safePageSize,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrevious: currentPage > 1,
        }
      })
    },
    async getById(id: string): Promise<T | null> {
      return request(() => getRecords().find((item) => item.id === id) ?? null)
    },
    getSnapshot: (): MockRepositorySnapshot => ({ ...snapshot }),
    setMode: (nextMode: MockRepositoryMode) => { mode = nextMode },
    reset: () => { mode = 'success'; snapshot = { status: 'idle', error: null } },
  }
}

export const mockRepositories = {
  chefs: createMockRepository(mockChefs, { name: 'Chefs' }),
  dishes: createMockRepository(mockDishes, { name: 'Dishes' }),
  orders: createMockRepository(mockOrders, { name: 'Orders' }),
  users: createMockRepository(mockUsers, { name: 'Users' }),
  mealPlans: createMockRepository(mockMealPlans, { name: 'Meal plans' }),
  subscriptions: createMockRepository(mockSubscriptions, { name: 'Subscriptions' }),
  payments: createMockRepository(mockPayments, { name: 'Payments' }),
  reviews: createMockRepository(mockReviews, { name: 'Reviews' }),
  notifications: createMockRepository(mockNotifications, { name: 'Notifications' }),
  ledgerEntries: createMockRepository(mockLedgerEntries, { name: 'Ledger entries' }),
  addresses: createMockRepository(mockAddresses, { name: 'Addresses' }),
  favorites: createMockRepository(mockFavorites, { name: 'Favorites' }),
  chatThreads: createMockRepository(mockChatThreads, { name: 'Chat threads' }),
  chatMessages: createMockRepository(mockChatMessages, { name: 'Chat messages' }),
  payouts: createMockRepository(mockPayouts, { name: 'Payouts' }),
  coupons: createMockRepository(mockCoupons, { name: 'Coupons' }),
  dashboardSummaries: createMockRepository(mockDashboardSummaries, { name: 'Dashboard summaries' }),
  moderationCases: createMockRepository(mockModerationCases, { name: 'Moderation cases' }),
  dlqEntries: createMockRepository(mockDlqEntries, { name: 'DLQ entries' }),
}

export type MockCollection = keyof typeof mockRepositories
