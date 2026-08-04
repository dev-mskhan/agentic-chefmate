import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    alias: {
      "@platform/shared-auth": path.resolve(__dirname, "../../packages/shared-auth/src"),
      "@platform/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@platform/shared-config": path.resolve(__dirname, "../../packages/shared-config/src"),
      "@platform/logger": path.resolve(__dirname, "../../packages/logger/src"),
      "@platform/auth-service": path.resolve(__dirname, "../auth-service/src/server.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
