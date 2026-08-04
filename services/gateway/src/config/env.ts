import { loadEnv, baseEnvSchema } from "@platform/shared-config";
import { z } from "zod";

export const gatewayEnvSchema = baseEnvSchema
  .omit({ MONGODB_URI: true, MONGODB_DB_NAME: true })
  .extend({
    JWT_PUBLIC_KEY: z.string().min(1),
    COOKIE_SECRET: z.string().min(1),
    AUTH_SERVICE_URL: z.string().url(),
    CLIENT_APP_URL: z.string().url(),
  });

export type GatewayConfig = z.infer<typeof gatewayEnvSchema>;

export function loadGatewayEnv(): GatewayConfig {
  return loadEnv(gatewayEnvSchema);
}
