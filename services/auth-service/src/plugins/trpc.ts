import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from '../trpc/router'
import { createContext } from '../trpc/context'

export default fp(async function trpcPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ error }) {
        fastify.log.error({ err: error }, 'tRPC error')
      },
    },
  })
  fastify.log.info('tRPC router registered at /trpc')
})
