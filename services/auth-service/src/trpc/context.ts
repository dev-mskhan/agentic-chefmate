import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Redis } from 'ioredis'
import { config } from '../config'

export interface AuthContext {
  req: FastifyRequest
  res: FastifyReply
  redis: Redis
  config: typeof config
}

export function createContext({
  req,
  res,
}: {
  req: FastifyRequest
  res: FastifyReply
}): AuthContext {
  // Redis is attached to fastify instance via @fastify/redis plugin
  const redis = (req.server as any).redis as Redis
  return { req, res, redis, config }
}
