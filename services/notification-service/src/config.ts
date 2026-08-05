import { createConfig, baseEnvSchema } from '@chefmate/config'
import { z } from 'zod'

const notifEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3006),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
  SENDGRID_API_KEY: z.string().min(1).optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('noreply@foodlancer.app'),
  SENDGRID_FROM_NAME: z.string().default('Foodlancer'),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
})

export type NotifConfig = z.infer<typeof notifEnvSchema>
export const config = createConfig(notifEnvSchema)
