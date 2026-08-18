import type { FastifyRequest, FastifyReply } from 'fastify'
import { extractPrincipal, Principal } from '@chefmate/auth-clients'
import { config } from '../config'

export interface ReviewContext {
  req:       FastifyRequest
  res:       FastifyReply
  principal: Principal | null
  config:    typeof config
}

export function createContext({
  req,
  res,
}: {
  req: FastifyRequest
  res: FastifyReply
}): ReviewContext {
  let principal: Principal | null = null
  try {
    principal = extractPrincipal(req.headers as Record<string, string | string[] | undefined>)
  } catch {
    // Unauthenticated — protectedProcedure will reject
  }
  return { req, res, principal, config }
}
