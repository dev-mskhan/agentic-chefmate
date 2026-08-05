import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import httpProxy from '@fastify/http-proxy'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { createAuthVerifyHook } from './auth-verify'
import type { Role } from '@chefmate/auth-clients'

interface RouteConfig {
  prefix: string
  target: string
  auth: boolean
  roles?: Role[]
}

interface RoutesYaml {
  routes: RouteConfig[]
}

export default fp(async function proxyPlugin(fastify: FastifyInstance) {
  const yamlPath = path.join(__dirname, '../config/routes.yaml')
  const rawYaml = fs.readFileSync(yamlPath, 'utf-8')
  const { routes } = yaml.load(rawYaml) as RoutesYaml

  for (const route of routes) {
    await fastify.register(httpProxy, {
      upstream: route.target,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
      preHandler: route.auth
        ? createAuthVerifyHook(route.roles)
        : undefined,
      // Strip internal headers from upstream response
      replyOptions: {
        rewriteRequestHeaders: (_req, headers) => {
          // Ensure internal headers can only be set by gateway
          const cleaned = { ...headers }
          delete cleaned['x-internal-secret']
          return cleaned
        },
      },
    })
    fastify.log.info(`Proxying ${route.prefix} → ${route.target} (auth: ${route.auth})`)
  }
})
