import type { FastifyRequest, FastifyReply } from 'fastify'
import { extractPrincipal } from '@chefmate/auth-clients'
import type { Principal } from '@chefmate/auth-clients'
import { config } from '../config'

export interface DashboardContext {
  req:       FastifyRequest
  res:       FastifyReply
  principal: Principal | null
  config:    typeof config
}

export function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }): DashboardContext {
  let principal: Principal | null = null
  try {
    principal = extractPrincipal(req.headers as Record<string, string | string[] | undefined>)
  } catch { /* unauthenticated */ }
  return { req, res, principal, config }
}
