import { createConfig, baseEnvSchema } from '@chefmate/config'
import { z } from 'zod'

const gatewayEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  CHEF_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  ORDER_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  ADMIN_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  NOTIFICATION_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  MEDIA_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  SUBSCRIPTION_SERVICE_URL: z.string().url().default('http://localhost:3009'),
  COOKIE_SECRET: z.string().min(32).default('dev-cookie-secret-min-32-characters!!'),
  JWKS_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  // Comma-separated list of allowed origins, e.g. "http://localhost:3000,https://app.chefmate.app"
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:19006'),
})

export type GatewayConfig = z.infer<typeof gatewayEnvSchema>
export const config = createConfig(gatewayEnvSchema)
