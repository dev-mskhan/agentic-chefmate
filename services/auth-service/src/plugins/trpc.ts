import { createTrpcPlugin } from '@chefmate/trpc'
import { appRouter } from '../trpc/router'
import { createContext } from '../trpc/context'

export default createTrpcPlugin({
  prefix:        '/api/v1/auth/trpc',
  router:        appRouter,
  createContext,
})
