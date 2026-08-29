import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  discoverChefs,
  discoverDishes,
  discoverMealPlans,
  getChefById,
  getDishById,
  getMealPlanById,
  type ChefRecord,
  type DishRecord,
  type MealPlanRecord,
  type ListResponse,
} from '../../services/api/publicCatalog'
import {
  getUserOrders,
  getOrderById,
  getUserSubscriptions,
  getUserProfile,
  getUserNotifications,
  type OrderRecord,
  type SubscriptionRecord,
  type UserProfileRecord,
  type NotificationRecord,
} from '../../services/api/userService'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    credentials: 'include',
  }),
  tagTypes: ['Chefs', 'Dishes', 'MealPlans', 'Orders', 'Subscriptions', 'Profile', 'Notifications'],
  endpoints: (builder) => ({
    getChefs: builder.query<ListResponse<ChefRecord>, { city?: string; cuisine?: string; page?: number; pageSize?: number } | void>({
      queryFn: async (params) => {
        try {
          const result = await discoverChefs(params || {})
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Chefs'],
    }),
    getChef: builder.query<ChefRecord | null, string>({
      queryFn: async (chefId) => {
        try {
          const result = await getChefById(chefId)
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: (_res, _err, id) => [{ type: 'Chefs', id }],
    }),
    getDishes: builder.query<ListResponse<DishRecord>, { chefId?: string; cuisine?: string; page?: number; pageSize?: number } | void>({
      queryFn: async (params) => {
        try {
          const result = await discoverDishes(params || {})
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Dishes'],
    }),
    getDish: builder.query<DishRecord | null, string>({
      queryFn: async (dishId) => {
        try {
          const result = await getDishById(dishId)
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: (_res, _err, id) => [{ type: 'Dishes', id }],
    }),
    getMealPlans: builder.query<ListResponse<MealPlanRecord>, { chefId?: string; page?: number; pageSize?: number } | void>({
      queryFn: async (params) => {
        try {
          const result = await discoverMealPlans(params || {})
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['MealPlans'],
    }),
    getMealPlan: builder.query<MealPlanRecord | null, string>({
      queryFn: async (planId) => {
        try {
          const result = await getMealPlanById(planId)
          return { data: result }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: (_res, _err, id) => [{ type: 'MealPlans', id }],
    }),
    getCustomerOrders: builder.query<OrderRecord[], void>({
      queryFn: async () => {
        try {
          const data = await getUserOrders()
          return { data }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Orders'],
    }),
    getCustomerOrder: builder.query<OrderRecord | null, string>({
      queryFn: async (orderId) => {
        try {
          const data = await getOrderById(orderId)
          return { data }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: (_res, _err, id) => [{ type: 'Orders', id }],
    }),
    getCustomerSubscriptions: builder.query<SubscriptionRecord[], void>({
      queryFn: async () => {
        try {
          const data = await getUserSubscriptions()
          return { data }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Subscriptions'],
    }),
    getUserProfile: builder.query<UserProfileRecord, void>({
      queryFn: async () => {
        try {
          const data = await getUserProfile()
          return { data }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Profile'],
    }),
    getUserNotifications: builder.query<NotificationRecord[], void>({
      queryFn: async () => {
        try {
          const data = await getUserNotifications()
          return { data }
        } catch (error) {
          return { error: { status: 500, data: error } }
        }
      },
      providesTags: ['Notifications'],
    }),
  }),
})

export const {
  useGetChefsQuery,
  useGetChefQuery,
  useGetDishesQuery,
  useGetDishQuery,
  useGetMealPlansQuery,
  useGetMealPlanQuery,
  useGetCustomerOrdersQuery,
  useGetCustomerOrderQuery,
  useGetCustomerSubscriptionsQuery,
  useGetUserProfileQuery,
  useGetUserNotificationsQuery,
} = baseApi
