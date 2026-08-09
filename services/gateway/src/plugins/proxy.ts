import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import httpProxy from '@fastify/http-proxy'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { createAuthVerifyHook } from './auth-verify'
import type { Role } from '@chefmate/auth-clients'
import { config } from '../config'

interface RouteConfig {
  prefix: string
  targetKey: string
  auth: boolean
  roles?: Role[]
}

interface RoutesYaml {
  routes: RouteConfig[]
}

const SERVICE_URL_MAP: Record<string, string> = {
  AUTH_SERVICE_URL:         config.AUTH_SERVICE_URL!,
  USER_SERVICE_URL:         config.USER_SERVICE_URL!,
  CHEF_SERVICE_URL:         config.CHEF_SERVICE_URL!,
  ORDER_SERVICE_URL:        config.ORDER_SERVICE_URL!,
  ADMIN_SERVICE_URL:        config.ADMIN_SERVICE_URL!,
  NOTIFICATION_SERVICE_URL: config.NOTIFICATION_SERVICE_URL!,
  MEDIA_SERVICE_URL:        config.MEDIA_SERVICE_URL!,
}

export default fp(async function proxyPlugin(fastify: FastifyInstance) {
  const yamlPath = path.join(__dirname, '../config/routes.yaml')
  const rawYaml = fs.readFileSync(yamlPath, 'utf-8')
  const { routes } = yaml.load(rawYaml) as RoutesYaml

  for (const route of routes) {
    const upstream = SERVICE_URL_MAP[route.targetKey]
    if (!upstream) {
      fastify.log.warn(`No URL configured for targetKey "${route.targetKey}" — skipping ${route.prefix}`)
      continue
    }

    await fastify.register(httpProxy, {
      upstream,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
      preHandler: route.auth ? createAuthVerifyHook(route.roles) : undefined,
      replyOptions: {
        rewriteRequestHeaders: (_req, headers) => {
          const cleaned = { ...headers }
          delete cleaned['x-internal-secret']
          return cleaned
        },
      },
    })
    fastify.log.info(`Proxying ${route.prefix} → ${upstream} (auth: ${route.auth})`)
  }
})
