import { createTrpcPlugin } from '@chefmate/trpc'
import { appRouter }        from '../trpc/router'
import { createContext }    from '../trpc/context'
import fp from 'fastify-plugin'

const registerTrpc = createTrpcPlugin({ prefix: '/trpc', router: appRouter, createContext })
const registerGatewayTrpc = createTrpcPlugin({
  prefix: '/api/v1/admin/trpc',
  router: appRouter,
  createContext,
})

export default fp(async (fastify) => {
  await fastify.register(registerTrpc)
  await fastify.register(registerGatewayTrpc)
})
