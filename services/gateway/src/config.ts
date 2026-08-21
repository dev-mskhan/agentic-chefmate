import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

// Load the gateway's own .env (services/gateway/.env) plus the root .env
// before createConfig reads process.env. Must run in this module — not in
// index.ts — because ES-module/tsx import hoisting can execute config.ts
// before index.ts's loadEnv() call, causing createConfig to fall back to
// defaults (e.g. the wrong COOKIE_SECRET, which breaks gateway cookie
// verification against auth-service-issued cookies).
loadEnv(__dirname)

const gatewayEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  CHEF_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  ORDER_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  ADMIN_SERVICE_URL: z.string().url().default('http://localhost:3014'),
  NOTIFICATION_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  MEDIA_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  SUBSCRIPTION_SERVICE_URL: z.string().url().default('http://localhost:3009'),
  REVIEW_SERVICE_URL:       z.string().url().default('http://localhost:3010'),
  CHAT_SERVICE_URL:         z.string().url().default('http://localhost:3011'),
  PAYOUT_SERVICE_URL:       z.string().url().default('http://localhost:3012'),
  DASHBOARD_SERVICE_URL:    z.string().url().default('http://localhost:3013'),
  COOKIE_SECRET: z.string().min(32).default('dev-cookie-secret-min-32-characters!!'),
  JWKS_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  // Comma-separated list of allowed origins, e.g. "http://localhost:3000,https://app.chefmate.app"
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:19006'),
  // Max requests per minute per identity (userId or IP). Default 200; raise for test runs.
  RATE_LIMIT_MAX: z.coerce.number().default(200),
})

export type GatewayConfig = z.infer<typeof gatewayEnvSchema>
export const config = createConfig(gatewayEnvSchema)
