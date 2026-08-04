import { readFileSync } from "node:fs";
import { baseEnvSchema, loadEnv } from "@platform/shared-config";
import { z } from "zod";

/**
 * Reads a PEM key from the env var. The value can be the PEM itself (with
 * escaped \n newlines) or a file path to a PEM file — both are supported as
 * long as usage is consistent (the .env.example documents this).
 */
function readPemOrPath(value: string): string {
  if (value.trim().startsWith("-----BEGIN")) {
    return value;
  }
  return readFileSync(value, "utf8").trim();
}

const pem = z.string().min(1, "PEM value or file path is required").transform(readPemOrPath);

export const authEnvSchema = baseEnvSchema.extend({
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z.string().url("GOOGLE_CALLBACK_URL must be a URL"),
  JWT_PRIVATE_KEY: pem,
  JWT_PUBLIC_KEY: pem,
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET is required"),
  CLIENT_APP_URL: z.string().url("CLIENT_APP_URL must be a URL"),
  RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function loadAuthEnv(): AuthEnv {
  return loadEnv(authEnvSchema);
}
