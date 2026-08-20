import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const schema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3013),
  MONGODB_URI: z.string().url(),
})

export type DashboardConfig = z.infer<typeof schema>
export const config = createConfig(schema)
