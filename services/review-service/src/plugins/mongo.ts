import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { connectMongo, disconnectMongo } from '@chefmate/db'
import { config } from '../config'

export default fp(async function mongoPlugin(fastify: FastifyInstance) {
  await connectMongo(config.MONGODB_URI)
  fastify.log.info('MongoDB connected')

  const { Review } = await import('../models/review.model')
  const { CompletedOrderEligibility } = await import('../models/completed-order-eligibility.model')
  await Promise.all([
    Review.syncIndexes().catch((err) => fastify.log.warn({ err }, 'Review syncIndexes warning')),
    CompletedOrderEligibility.syncIndexes().catch((err) => fastify.log.warn({ err }, 'CompletedOrderEligibility syncIndexes warning')),
  ])
  fastify.log.info('MongoDB indexes synced')

  fastify.addHook('onClose', async () => {
    await disconnectMongo()
    fastify.log.info('MongoDB disconnected')
  })
})
