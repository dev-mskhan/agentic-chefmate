import { createTrpcPlugin } from '@chefmate/trpc'
import { appRouter } from '../trpc/router'
import { createContext } from '../trpc/context'

export default createTrpcPlugin({ prefix: '/trpc', router: appRouter, createContext })
