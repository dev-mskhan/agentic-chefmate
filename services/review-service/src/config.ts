import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const reviewServiceEnvSchema = baseEnvSchema.extend({
  PORT:            z.coerce.number().default(3010),
  MONGODB_URI:     z.string().url(),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
})

export type ReviewServiceConfig = z.infer<typeof reviewServiceEnvSchema>

export const config = createConfig(reviewServiceEnvSchema)
