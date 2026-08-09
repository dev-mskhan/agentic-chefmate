import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { connectMongo, disconnectMongo } from '@chefmate/db'
import { config } from '../config'

export default fp(async function mongoPlugin(fastify: FastifyInstance) {
  await connectMongo(config.MONGODB_URI)
  fastify.log.info('MongoDB connected')

  fastify.addHook('onClose', async () => {
    await disconnectMongo()
    fastify.log.info('MongoDB disconnected')
  })
})
