import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const payoutServiceEnvSchema = baseEnvSchema.extend({
  PORT:                       z.coerce.number().default(3012),
  MONGODB_URI:                z.string().url(),
  REDIS_URL:                  z.string().url(),
  REDPANDA_BROKER:            z.string().default('localhost:9092'),
  STRIPE_SECRET_KEY:          z.string().min(1),
  STRIPE_WEBHOOK_SECRET:      z.string().min(1),
  INTERNAL_SECRET:            z.string().min(16),
  STRIPE_CONNECT_RETURN_URL:  z.string().url(),
  STRIPE_CONNECT_REFRESH_URL: z.string().url(),
  PLATFORM_FEE_BPS:           z.coerce.number().int().min(0).max(10000).default(1000),
})

export type PayoutServiceConfig = z.infer<typeof payoutServiceEnvSchema>
export const config = createConfig(payoutServiceEnvSchema)
