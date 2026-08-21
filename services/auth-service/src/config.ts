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
  // Shared secret for service-to-service calls (internal procedures).
  // Must match the INTERNAL_SECRET in caller services (chef-service, admin-service, …).
  INTERNAL_SECRET: z.string().min(16).default('dev-internal-secret-32-characters!!'),
  // Pre-seeded admin account (created at boot if no ADMIN user exists).
  SEED_ADMIN_EMAIL: z.string().email().default('admin@chefmate.test'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('AdminPass123!'),
})

export type AuthConfig = z.infer<typeof authEnvSchema>

export const config = createConfig(authEnvSchema)