import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react'
import {
  mockRepositories,
  type MockCollection,
  type PaginatedResult,
} from '../services/mockRepository'
import type { AuthIdentity } from '../types/domain'
import { demoIdentity } from './auth'

export type CollectionRecord = Awaited<ReturnType<typeof mockRepositories[MockCollection]['list']>>[number]
export type CollectionQuery = { collection: MockCollection; page?: number; pageSize?: number }

type MockRequest = string | (FetchArgs & { url: string })
type ApiError = { status: number | string; data?: { message?: string } }

const gatewayPaths: Record<MockCollection, string> = {
  chefs: '/api/v1/chefs',
  dishes: '/api/v1/chefs/dishes',
  orders: '/api/v1/orders',
  users: '/api/v1/users',
  mealPlans: '/api/v1/chefs/meal-plans',
  subscriptions: '/api/v1/subscriptions',
  payments: '/api/v1/payments',
  reviews: '/api/v1/reviews',
  notifications: '/api/v1/notifications',
  ledgerEntries: '/api/v1/payouts/ledger',
  addresses: '/api/v1/users/addresses',
  favorites: '/api/v1/users/favorites',
  chatThreads: '/api/v1/chat/threads',
  chatMessages: '/api/v1/chat/messages',
  payouts: '/api/v1/payouts',
  coupons: '/api/v1/admin/coupons',
  dashboardSummaries: '/api/v1/user-dashboard/summary',
  moderationCases: '/api/v1/admin/moderation',
  dlqEntries: '/api/v1/admin/dlq',
}

const collectionFromPath = (url: string): MockCollection | null =>
  (Object.entries(gatewayPaths).find(([, path]) => path === url)?.[0] as MockCollection | undefined) ?? null

export const gatewayBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000',
  credentials: 'include',
})

export const mockBaseQuery: BaseQueryFn<MockRequest, unknown, ApiError> = async (args) => {
  const request = typeof args === 'string' ? args : args.url
  if (request === '/api/v1/auth/me') return { data: demoIdentity }
  const collection = collectionFromPath(request)
  if (!collection) return { error: { status: 404, data: { message: `No mock route for ${request}` } } }

  const params = typeof args === 'string' ? undefined : args.params
  const page = Number(params?.page ?? 1)
  const pageSize = Number(params?.pageSize ?? 10)
  try {
    return { data: await mockRepositories[collection].listPage({ page, pageSize }) }
  } catch (error) {
    return {
      error: {
        status: 'MOCK_ERROR',
        data: { message: error instanceof Error ? error.message : 'Mock request failed.' },
      },
    }
  }
}

const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false'
const baseQuery = demoMode ? mockBaseQuery : gatewayBaseQuery

export const api = createApi({
  reducerPath: 'chefmateApi',
  baseQuery,
  tagTypes: ['Collection', 'CurrentUser'],
  endpoints: (builder) => ({
    listCollection: builder.query<PaginatedResult<CollectionRecord>, CollectionQuery>({
      query: ({ collection, page = 1, pageSize = 10 }) => ({
        url: gatewayPaths[collection],
        params: { page, pageSize },
      }),
      providesTags: (_result, _error, { collection }) => [{ type: 'Collection', id: collection }],
    }),
    currentUser: builder.query<AuthIdentity, void>({
      query: () => ({ url: '/api/v1/auth/me' }),
      providesTags: ['CurrentUser'],
    }),
  }),
})

export const { useListCollectionQuery, useCurrentUserQuery } = api
