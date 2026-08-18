import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const chatServiceEnvSchema = baseEnvSchema.extend({
  PORT:             z.coerce.number().default(3011),
  MONGODB_URI:      z.string().url(),
  REDIS_URL:        z.string().url(),
  REDPANDA_BROKER:  z.string().default('localhost:9092'),
  JWT_PUBLIC_KEY:   z.string().min(1),
  AUTH_SERVICE_URL: z.string().url().optional(),
})

export type ChatServiceConfig = z.infer<typeof chatServiceEnvSchema>
export const config = createConfig(chatServiceEnvSchema)
