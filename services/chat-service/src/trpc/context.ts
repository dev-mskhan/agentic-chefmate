import type { FastifyRequest, FastifyReply } from 'fastify'
import type Redis from 'ioredis'
import { extractPrincipal, Principal } from '@chefmate/auth-clients'
import { config } from '../config'

export interface ChatContext {
  req:       FastifyRequest
  res:       FastifyReply
  principal: Principal | null
  redis:     Redis
  config:    typeof config
}

export function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }): ChatContext {
  let principal: Principal | null = null
  try {
    principal = extractPrincipal(req.headers as Record<string, string | string[] | undefined>)
  } catch {
    // Unauthenticated — protectedProcedure will reject
  }

  const redis = (req.server as any).redis as Redis
  return { req, res, principal, redis, config }
}
