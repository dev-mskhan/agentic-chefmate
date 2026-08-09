import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const userServiceEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3002),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
})

export type UserServiceConfig = z.infer<typeof userServiceEnvSchema>

export const config = createConfig(userServiceEnvSchema)
