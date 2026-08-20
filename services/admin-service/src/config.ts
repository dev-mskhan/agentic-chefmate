import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const adminServiceEnvSchema = baseEnvSchema.extend({
  PORT:                z.coerce.number().default(3014),
  MONGODB_URI:         z.string().url(),
  INTERNAL_SECRET:     z.string().min(16),
  CHEF_SERVICE_URL:    z.string().url().default('http://localhost:3003'),
  AUTH_SERVICE_URL:    z.string().url().default('http://localhost:3001'),
  REVIEW_SERVICE_URL:  z.string().url().default('http://localhost:3010'),
  PAYOUT_SERVICE_URL:  z.string().url().default('http://localhost:3012'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:3008'),
})

export type AdminServiceConfig = z.infer<typeof adminServiceEnvSchema>
export const config = createConfig(adminServiceEnvSchema)
