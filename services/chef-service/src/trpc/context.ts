import type { FastifyRequest, FastifyReply } from 'fastify'
import type Redis from 'ioredis'
import { extractPrincipal, Principal } from '@chefmate/auth-clients'
import { config } from '../config'
import { RedisCacheService } from '../services/redis-cache.service'

export interface ChefContext {
  req:       FastifyRequest
  res:       FastifyReply
  principal: Principal | null
  redis:     Redis
  cache:     RedisCacheService
  config:    typeof config
}

export function createContext({
  req,
  res,
}: {
  req: FastifyRequest
  res: FastifyReply
}): ChefContext {
  let principal: Principal | null = null
  try {
    principal = extractPrincipal(req.headers as Record<string, string | string[] | undefined>)
  } catch {
    // Unauthenticated — protectedProcedure will reject
  }

  const redis = (req.server as any).redis as Redis
  const cache = new RedisCacheService(redis)

  return { req, res, principal, redis, cache, config }
}
