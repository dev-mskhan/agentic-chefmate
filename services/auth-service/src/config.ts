import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const authEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_KEY_ID: z.string().default('chefmate-auth-v1'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url().default(
    'http://localhost:3001/api/v1/auth/google/callback'
  ),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
  COOKIE_SECRET: z.string().min(32),
  APP_URL: z.string().url().default('http://localhost:3000'),
})

export type AuthConfig = z.infer<typeof authEnvSchema>

export const config = createConfig(authEnvSchema)