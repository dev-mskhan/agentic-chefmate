import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const orderServiceEnvSchema = baseEnvSchema.extend({
  PORT:             z.coerce.number().default(3004),
  MONGODB_URI:      z.string().url(),
  REDIS_URL:        z.string().url(),
  REDPANDA_BROKER:  z.string().default('localhost:9092'),
  CHEF_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  INTERNAL_SECRET:  z.string().min(16).default('dev-internal-secret-min-16chars!'),
})

export type OrderServiceConfig = z.infer<typeof orderServiceEnvSchema>

export const config = createConfig(orderServiceEnvSchema)
