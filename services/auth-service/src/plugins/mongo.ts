import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { connectMongo } from '@chefmate/db'
import { config } from '../config'

export default fp(async function mongoPlugin(fastify: FastifyInstance) {
  await connectMongo(config.MONGODB_URI)
  fastify.log.info('MongoDB connected')
})
