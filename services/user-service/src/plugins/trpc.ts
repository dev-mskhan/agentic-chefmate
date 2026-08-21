import { createTrpcPlugin } from '@chefmate/trpc'
import { appRouter } from '../trpc/router'
import { createContext } from '../trpc/context'

export default createTrpcPlugin({
  // Mount at /api/v1/users/trpc so it matches the path the gateway forwards
  // (the gateway proxies /api/v1/users → user-service with rewritePrefix
  // keeping the full /api/v1/users/... path). The gateway route for
  // /api/v1/users is auth-gated, so the auth-verify hook injects the
  // x-user-id / x-user-role / x-user-email principal headers before the
  // request reaches this router.
  prefix:        '/api/v1/users/trpc',
  router:        appRouter,
  createContext,
})
