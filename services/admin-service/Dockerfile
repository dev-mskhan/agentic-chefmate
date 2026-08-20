# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/errors/package.json ./packages/errors/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/auth-clients/package.json ./packages/auth-clients/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY services/admin-service/package.json ./services/admin-service/package.json

RUN pnpm install --frozen-lockfile

COPY packages/config ./packages/config
COPY packages/errors ./packages/errors
COPY packages/logger ./packages/logger
COPY packages/db ./packages/db
COPY packages/auth-clients ./packages/auth-clients
COPY packages/trpc ./packages/trpc
COPY services/admin-service ./services/admin-service

RUN pnpm --filter @chefmate/config build
RUN pnpm --filter @chefmate/errors build
RUN pnpm --filter @chefmate/logger build
RUN pnpm --filter @chefmate/db build
RUN pnpm --filter @chefmate/auth-clients build
RUN pnpm --filter @chefmate/trpc build
RUN pnpm --filter @chefmate/admin-service build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/errors/package.json ./packages/errors/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/auth-clients/package.json ./packages/auth-clients/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY services/admin-service/package.json ./services/admin-service/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/errors/dist ./packages/errors/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/auth-clients/dist ./packages/auth-clients/dist
COPY --from=builder /app/packages/trpc/dist ./packages/trpc/dist
COPY --from=builder /app/services/admin-service/dist ./services/admin-service/dist

WORKDIR /app/services/admin-service

EXPOSE 3014

CMD ["node", "dist/index.js"]
