import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const paymentServiceEnvSchema = baseEnvSchema.extend({
  PORT:                  z.coerce.number().default(3008),
  MONGODB_URI:           z.string().url(),
  REDIS_URL:             z.string().url(),
  REDPANDA_BROKER:       z.string().default('localhost:9092'),
  STRIPE_SECRET_KEY:     z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  INTERNAL_SECRET:       z.string().min(16),
  ORDER_SERVICE_URL:     z.string().url().default('http://localhost:3004'),
})

export type PaymentServiceConfig = z.infer<typeof paymentServiceEnvSchema>
export const config = createConfig(paymentServiceEnvSchema)
