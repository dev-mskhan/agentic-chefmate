import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const chefServiceEnvSchema = baseEnvSchema.extend({
  PORT:             z.coerce.number().default(3003),
  MONGODB_URI:      z.string().url(),
  REDIS_URL:        z.string().url(),
  REDPANDA_BROKER:  z.string().default('localhost:9092'),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
})

export type ChefServiceConfig = z.infer<typeof chefServiceEnvSchema>

export const config = createConfig(chefServiceEnvSchema)
