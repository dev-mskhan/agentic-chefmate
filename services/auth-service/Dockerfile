FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/logger/package.json packages/logger/
COPY packages/shared-config/package.json packages/shared-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-auth/package.json packages/shared-auth/
COPY services/auth-service/package.json services/auth-service/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules
COPY --from=deps /app/packages/shared-config/node_modules ./packages/shared-config/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-auth/node_modules ./packages/shared-auth/node_modules
COPY --from=deps /app/services/auth-service/node_modules ./services/auth-service/node_modules
COPY tsconfig.base.json turbo.json ./
COPY packages/logger ./packages/logger
COPY packages/shared-config ./packages/shared-config
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-auth ./packages/shared-auth
COPY services/auth-service ./services/auth-service
RUN pnpm --filter @platform/logger build
RUN pnpm --filter @platform/shared-config build
RUN pnpm --filter @platform/shared-types build
RUN pnpm --filter @platform/shared-auth build
RUN pnpm --filter @platform/auth-service build

FROM base AS runtime
COPY --from=build /app/services/auth-service/dist ./dist
COPY --from=build /app/services/auth-service/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-auth/dist ./packages/shared-auth/dist
COPY --from=build /app/packages/shared-auth/package.json ./packages/shared-auth/
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=build /app/packages/shared-config/dist ./packages/shared-config/dist
COPY --from=build /app/packages/shared-config/package.json ./packages/shared-config/
COPY --from=build /app/packages/logger/dist ./packages/logger/dist
COPY --from=build /app/packages/logger/package.json ./packages/logger/
EXPOSE 3000
CMD ["node", "dist/server.js"]
