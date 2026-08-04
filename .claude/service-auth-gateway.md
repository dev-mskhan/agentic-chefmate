# Task for Claude Code: Build `auth-service` and `gateway` for RepoGraph

Read this entire document before writing a single line of code. It contains the full context of the monorepo, decisions that are already final (do not re-derive, "simplify," or second-guess them), exact folder structures, and a required build order. Where this document is explicit, treat it as ground truth over your own instincts or defaults.

Do not start writing code until you've read to the end. If anything is genuinely ambiguous after reading everything, stop and ask — don't guess and don't silently deviate.

---

## 1. What RepoGraph is

RepoGraph is an autonomous system that understands any open-source project better than reading its README — a dynamic multi-agent GraphRAG platform. Given a public GitHub repo, it ingests code/docs/issues/PRs/commits, builds a knowledge graph + vector index, and answers questions like "why was this architecture chosen" or "where should I start contributing" using a LangGraph.js planner that assembles a different agent workflow per question type.

It's a **pnpm + Turborepo monorepo**, MERN-based but split into independently deployable microservices (Node.js + TypeScript everywhere), with MongoDB (database-per-service pattern), Neo4j (knowledge graph — not built yet), and Qdrant (vector search — not built yet).

**Deployment model**: local dev runs services directly via `pnpm`/`turbo`, no Docker required day-to-day. Docker exists for CI/CD and production only. Nothing hardcodes `localhost` — everything reads connection info from env vars, because the same code must run correctly both ways.

---

## 2. What already exists in the repo — do not redesign, do not touch beyond the one noted addition

```
repograph/
  package.json                  # root, packageManager: pnpm@11.18.0, uses turbo
  turbo.json                    # build depends on ^build, dev is persistent+uncached
  pnpm-workspace.yaml           # packages: packages/*, apps/*, services/*
                                 # onlyBuiltDependencies: [esbuild]
                                 # catalog: { typescript: ^7.0.2 }
  tsconfig.base.json            # ES2022, NodeNext/NodeNext, strict, composite, noUncheckedIndexedAccess
  tsconfig.json                 # root project-references file — you will add new packages/services here
  packages/
    logger/                     # @platform/logger — pino + pino-http factory
      src/index.ts              # exports createLogger(), createHttpLogger()
    shared-types/                # @platform/shared-types
      src/index.ts              # exports: BaseDocument, PaginationParams, PaginatedResult,
                                 #   ApiResponse/ApiSuccessResponse/ApiErrorResponse,
                                 #   AppError + subclasses (NotFoundError, ValidationError,
                                 #     UnauthorizedError, ForbiddenError, ConflictError,
                                 #     RateLimitError, UpstreamServiceError),
                                 #   AgentState types (not relevant here),
                                 #   connectDb() — Mongoose connection helper, DATABASE-PER-SERVICE:
                                 #     one shared Mongo cluster, each service passes its own dbName.
                                 #     NEVER query another service's database directly.
                                 #   REQUEST_ID_HEADER, QUEUE_NAMES, PUBSUB_CHANNELS, SSE_EVENTS
                                 #   asyncHandler() — wraps async Express handlers
    shared-config/                # @platform/shared-config
      src/index.ts               # exports baseEnvSchema (zod: NODE_ENV, PORT, LOG_LEVEL,
                                  #   MONGODB_URI, MONGODB_DB_NAME, REDIS_URL) and loadEnv(schema)
```

Every package: `type: module`, `moduleResolution: NodeNext` → **every relative import in source files must use an explicit `.js` extension**, even in `.ts` files. This is a NodeNext/ESM requirement, not a typo — do not "fix" it. TypeScript version always comes from the pnpm catalog (`"typescript": "catalog:"`), never hardcoded.

**Do not touch** `packages/logger`, `packages/shared-types`, or `packages/shared-config` except to:
- add `PUBSUB_CHANNELS.AUTH_EVENTS` if missing (real-time auth event notifications — see §4.4.4)
- add `QUEUE_NAMES.AUTH_WELCOME_EMAIL` and `QUEUE_NAMES.AUTH_AUDIT_LOG` if missing (durable background jobs — see §4.7)

Extend these files, never duplicate the constants locally in a service.

---

## 3. What you're building now

Two new workspace members under `services/`, plus one new shared package:

1. **`packages/shared-auth`** — JWT payload type, sign/verify functions, cookie name + option constants. Both auth-service and gateway depend on this so the token shape can never silently drift between them.
2. **`services/auth-service`** — JWT auth with Google OAuth2, access/refresh tokens as signed cookies, Redis-backed sessions/cache/rate-limiting/pub-sub, RabbitMQ-backed background jobs, Zod validation, Mongoose models, a service layer, both REST and tRPC endpoints.
3. **`services/gateway`** — GraphQL (Yoga + Pothos) public API, the **only public entry point** to the platform. Verifies JWTs from cookies, calls auth-service's tRPC router with full type safety, proxies the two OAuth REST redirect endpoints through unchanged, and transparently refreshes expired access tokens (see §4.8) so the frontend never has to manage a separate refresh call.

---

## 4. Non-negotiable architecture decisions

These resolve ambiguity in the original requirements on purpose. Implement exactly this.

### 4.1 REST vs tRPC split (both required, for different reasons — do not collapse to one)
- **REST**, mounted at `/api/v1/auth/*`, handles anything needing raw HTTP semantics (redirects, cookie-writing):
  - `GET /api/v1/auth/google` — redirects to Google's consent screen
  - `GET /api/v1/auth/google/callback` — OAuth code exchange, creates/updates the User, issues tokens, sets both cookies, redirects to the client app
  - `POST /api/v1/auth/refresh` — reads refresh cookie, rotates tokens, sets new cookies
  - `POST /api/v1/auth/logout` — revokes the session, clears cookies
- **tRPC**, mounted at `/api/v1/trpc`, handles typed calls with **no** redirect/cookie-writing:
  - `auth.getCurrentUser` — protected procedure, returns the current user from the verified access token
  - `auth.listSessions` — protected procedure, lists this user's active sessions (device/IP/createdAt) from Redis
  - `auth.revokeSession` — protected procedure, revokes one specific session by id
  - This router (`AppRouter` type) is what `gateway` imports **as a type only** (`import type { AppRouter } from "@platform/auth-service"`). Auth-service must export its router type from its package entry point.
  - **Cookie-writing must never happen inside a tRPC procedure.** This rule matters for §4.8 below — read it carefully, it changes how the "auto-refresh" feature has to be wired.

### 4.2 JWT: RS256, not shared-secret HMAC
- Auth-service generates/holds an RSA keypair. **Only auth-service has the private key** (`JWT_PRIVATE_KEY` env var, PEM). It signs access tokens with it.
- Every other service that verifies a token (gateway now, others later) only needs `JWT_PUBLIC_KEY` (PEM, env var).
- Use `jose@^6.2.7`, not `jsonwebtoken` — ESM-native, promise-based, clean RS256 support.
- Access token payload (defined once, in `packages/shared-auth`, imported everywhere): `{ sub: string /* userId */, email: string, role: "user" | "admin", sessionId: string, iat, exp }`.
- Access token TTL: 15 minutes. Refresh token TTL: 30 days.
- Refresh tokens are opaque random strings (not JWTs) — `crypto.randomBytes(48).toString("hex")`, store only a SHA-256 hash of it in Redis, never the raw value (same treatment as a password).

### 4.3 Cookies
- Both tokens set as **signed** cookies via `cookie-parser`'s signed-cookie support (`COOKIE_SECRET`, separate from the JWT keys).
- Cookie names, exported as constants from `packages/shared-auth`: `access_token`, `refresh_token`.
- Options: `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `signed: true`, `path: "/"`. Access cookie `maxAge` matches 15 min; refresh cookie `maxAge` matches 30 days.

### 4.4 Redis — four distinct uses, don't conflate them
`ioredis@^6.0.0`. One client per concern (or clearly namespaced keys), all via `REDIS_URL` from `baseEnvSchema`.

1. **Session storage** (source of truth for active sessions, NOT Mongo): key `session:{sessionId}` → JSON `{ userId, refreshTokenHash, userAgent, ip, createdAt }`, `EX` TTL = 30 days. `auth.listSessions` scans by userId via a secondary set `user-sessions:{userId}` → Set of sessionIds (Redis `KEYS`/`SCAN` by value isn't practical). Logout/revoke deletes both the session key and removes the id from that set.
2. **Caching** (cache-aside, user profile lookups): key `cache:user:{userId}` → JSON user profile, TTL 5 min. **Active invalidation, not TTL-only**: on any user update and on logout, `DEL cache:user:{userId}` explicitly. Comment this in code so the strategy (active invalidation + short TTL as backstop) is obvious.
3. **Rate limiting**: `rate-limiter-flexible@^11.2.0` with Redis backend. Apply to: `/api/v1/auth/google/callback` (5 req/60s per IP) and `/api/v1/auth/refresh` (10 req/60s per IP). Returns `429` via `RateLimitError` from `@platform/shared-types`.
4. **Pub/sub**: on login, logout, session revocation — `PUBLISH` to `PUBSUB_CHANNELS.AUTH_EVENTS` (extend `shared-types`, don't duplicate locally). Payload: `{ type: "login" | "logout" | "session.revoked", userId, sessionId, timestamp }`. Nothing subscribes yet (notification-service doesn't exist) — just publish, this is future-proofing per the original spec, not dead code.

### 4.5 Google OAuth2
- `google-auth-library@^11.0.0`'s `OAuth2Client`. Consent URL with `access_type: "offline"`, scopes `openid`, `email`, `profile`. On callback: exchange code, verify ID token, extract `{ googleId (sub), email, name, avatarUrl (picture) }`.
- `UserService.findOrCreateFromGoogleProfile(...)` — find by `googleId`, create if missing, update profile fields if found (name/avatar can change on Google's side).

### 4.6 GraphQL gateway
- `graphql-yoga@^5.21.2` + `@pothos/core@^4.13.1` (code-first, no `.graphql` SDL, no codegen).
- Context per request: `{ user: AccessTokenPayload | null, authClient: TrpcClient }`. `user` populated by verifying `access_token` via `verifyAccessToken()` from `@platform/shared-auth` — invalid/missing → `null`, protected resolvers throw. (This base behavior is extended by §4.8 below — read that before implementing `context.ts`.)
- Schema: `Query.me: User`, `Query.sessions: [Session!]!`, `Mutation.revokeSession(sessionId: ID!): Boolean!`. All three call the auth-service tRPC client — gateway has zero data-layer knowledge, it only orchestrates.
- OAuth REST redirect endpoints proxied through unchanged so auth-service is never exposed to the browser directly.
- Rate limiting at the gateway too: 100 req/60s per IP on the GraphQL endpoint as a coarse platform-wide guard, independent of auth-service's endpoint-specific limits.

### 4.7 RabbitMQ — durable background jobs (distinct from Redis pub/sub)

Redis pub/sub (§4.4.4) is for cheap, ephemeral, fire-and-forget real-time notifications with no delivery guarantee and no consumer yet. RabbitMQ is for **actual background job processing that needs to survive a restart and be retried on failure** — a different concern, don't merge them.

Use `amqplib@^0.10.x`.

- **auth-service owns both the producer and the consumer** for now (no separate worker service — that's future work, don't build a new service for this task). Start the consumer(s) from `server.ts` alongside the HTTP server, in the same process, using their own channel.
- Exchange: a single durable topic exchange, e.g. `auth.events` (durable: true). Queues bound to it, durable: true, with a basic dead-letter exchange/queue for messages that fail processing after retries — implement this properly, not just documented.
- Queue names exported from `packages/shared-types` as `QUEUE_NAMES.AUTH_WELCOME_EMAIL` and `QUEUE_NAMES.AUTH_AUDIT_LOG` (add if missing, don't duplicate locally).
- Two concrete jobs for this task:
  1. **`AUTH_WELCOME_EMAIL`** — enqueued when `UserService.findOrCreateFromGoogleProfile` creates a *new* user (not on subsequent logins). Consumer logs/simulates sending a welcome email (stub the actual email send behind an interface — e.g. `email.service.ts` with a `sendWelcomeEmail(user)` method that just logs in this task; don't wire a real email provider, that's out of scope, but structure it so swapping in a real provider later is a one-file change).
  2. **`AUTH_AUDIT_LOG`** — enqueued on login, logout, refresh, and session revocation. Consumer persists an `AuditLog` Mongo document (`models/audit-log.model.ts`: `{ userId, eventType, ip, userAgent, metadata, createdAt }`). This decouples audit writes from the request/response cycle — the HTTP/tRPC handler publishes and returns immediately, it never waits on the Mongo write.
- Publish with `persistent: true` messages and confirm-channel publishing (`confirmChannel`, not a fire-and-forget plain channel) so a publish failure is actually surfaced in logs, not silently dropped.
- Graceful shutdown: close the RabbitMQ channel/connection on `SIGINT`/`SIGTERM` alongside Mongo/Redis, after in-flight consumer work finishes or is safely nacked for redelivery — don't just kill the process out from under an in-progress job.
- New env var: `RABBITMQ_URL`, added to `authEnvSchema` and `.env.example`.
- Unit-test the producers and consumers with a mocked/in-memory approach (there's a widely-used in-memory amqplib mock — pick one, or hand-roll a minimal fake channel — the point is no real RabbitMQ connection in the test suite, consistent with §7's "no real network calls in tests" rule).

### 4.8 Auto-refresh on `getMe` — no separate frontend refresh call

The frontend should be able to call the GraphQL `me` query and, if the access token has expired but the refresh token is still valid, get a successful response with new cookies silently issued — instead of getting a 401 and having to make a second `refresh` call itself.

This has to respect §4.1 (cookie-writing can never happen inside a tRPC procedure), so it's implemented at the **gateway**, not by relaxing the tRPC rule:

1. In gateway's `buildContext(req, res)`:
   - Try to verify the `access_token` cookie with `verifyAccessToken()`. If valid → set `context.user`, done, proceed normally.
   - If invalid/missing → look for a `refresh_token` cookie. If also missing → `context.user = null` (protected resolvers throw a clean `UnauthorizedError`, as already required).
   - If a refresh token cookie is present → gateway calls auth-service's **REST** `POST /api/v1/auth/refresh` endpoint (server-to-server HTTP call, not tRPC — this is exactly the kind of cookie-writing operation REST owns), **forwarding the incoming request's cookies** (`Cookie` header) so auth-service can read+rotate the refresh token, and forwarding the original client's IP (e.g. via `X-Forwarded-For`) so auth-service's rate limiter on `/refresh` limits by the real client, not by the gateway's own IP.
   - Auth-service's response will include `Set-Cookie` headers for the newly rotated `access_token` and `refresh_token`. The gateway must relay those `Set-Cookie` headers onto its own response to the browser (so the browser's cookie jar gets the new tokens) — do not swallow them.
   - If the refresh call succeeds (200): verify the new access token, set `context.user`, and proceed — the original `me` query (or any other resolver in that request) now succeeds transparently. If it fails (401/429/etc.): `context.user = null`, proceed to the normal clean-auth-error path — do not throw a raw/uncaught error, do not crash the process.
2. Auth-service's existing `POST /api/v1/auth/refresh` REST handler needs no behavior change for this — it already rotates the refresh token and sets cookies; the gateway is just calling it as a client instead of the browser doing so directly.
3. Add an explicit integration test in `services/gateway/tests/integration/graphql.test.ts` covering: expired/invalid access token + valid refresh token → `me` succeeds and `Set-Cookie` headers are present on the gateway's response. And: expired access token + missing/invalid refresh token → clean GraphQL auth error, no crash.
4. This same fallback belongs in `buildContext`, so it automatically covers every resolver in the schema (`sessions`, `revokeSession`, and anything added later) — don't special-case it to only the `me` query.

---

## 5. Exact folder structures — follow these exactly

### 5.1 `packages/shared-auth`
```
packages/shared-auth/
  package.json              # name: @platform/shared-auth, deps: jose
  tsconfig.json             # extends ../../tsconfig.base.json, references: none
  src/
    types.ts                # AccessTokenPayload interface
    jwt.ts                  # signAccessToken(payload, privateKeyPem), verifyAccessToken(token, publicKeyPem)
    cookies.ts              # ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE constants;
                             #   buildCookieOptions(maxAgeMs) helper returning the shared options from §4.3
    index.ts                # barrel export
```

### 5.2 `services/auth-service`
```
services/auth-service/
  package.json
  tsconfig.json              # extends ../../tsconfig.base.json, references: shared-auth, shared-types, shared-config, logger
  jest.config.ts             # @swc/jest transform, testEnvironment: node
  .env.example               # every env var below, placeholder values, committed to git
  Dockerfile
  src/
    config/
      env.ts                 # authEnvSchema = baseEnvSchema.extend({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
                              #   GOOGLE_CALLBACK_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, COOKIE_SECRET,
                              #   CLIENT_APP_URL, RABBITMQ_URL })
    models/
      user.model.ts           # googleId (unique, indexed), email (unique, indexed), name, avatarUrl,
                               #   role ("user"|"admin", default "user")
      audit-log.model.ts       # userId, eventType, ip, userAgent, metadata, createdAt
    validators/
      auth.validators.ts      # zod: googleCallbackQuerySchema ({ code, state? }), revokeSessionInputSchema
    services/
      google-oauth.service.ts # consent URL generation, code exchange, ID token verification
      user.service.ts         # findOrCreateFromGoogleProfile (enqueues AUTH_WELCOME_EMAIL on create), findById (uses cache.service)
      token.service.ts        # issueTokenPair(user, sessionMeta), rotateRefreshToken(oldToken), revoke
      session.service.ts      # Redis session CRUD (§4.4.1)
      cache.service.ts        # Redis cache-aside + explicit invalidation (§4.4.2)
      rate-limit.service.ts   # rate-limiter-flexible instances, wired to Redis
      pubsub.service.ts       # publisher helper for PUBSUB_CHANNELS.AUTH_EVENTS
      email.service.ts        # sendWelcomeEmail(user) — stubbed/logged, structured for a real provider later
      audit.service.ts        # persistAuditLog(entry) — called by the AUTH_AUDIT_LOG consumer
    queue/
      rabbitmq.client.ts      # amqplib connection + confirm-channel factory using RABBITMQ_URL
      producers/
        welcome-email.producer.ts  # publish to QUEUE_NAMES.AUTH_WELCOME_EMAIL
        audit-log.producer.ts      # publish to QUEUE_NAMES.AUTH_AUDIT_LOG
      consumers/
        welcome-email.consumer.ts  # consumes AUTH_WELCOME_EMAIL, calls email.service, acks/nacks with DLQ on failure
        audit-log.consumer.ts      # consumes AUTH_AUDIT_LOG, calls audit.service, acks/nacks with DLQ on failure
    controllers/
      auth.controller.ts      # thin: validate input, call services, set cookies, respond/redirect.
                               #   NO business logic here.
    routes/
      v1/
        auth.routes.ts        # wires auth.controller onto GET /google, GET /google/callback,
                               #   POST /refresh, POST /logout — each wrapped in asyncHandler()
      index.ts                # mounts v1 router at /api/v1/auth
    trpc/
      context.ts               # tRPC context: verifies access_token cookie, sets ctx.user
      trpc.ts                  # initTRPC, publicProcedure, protectedProcedure (throws UnauthorizedError
                                #   via middleware if ctx.user is null)
      routers/
        auth.router.ts         # getCurrentUser, listSessions, revokeSession (§4.1)
        index.ts                # export const appRouter = router({ auth: authRouter });
                                 #   export type AppRouter = typeof appRouter;
    middleware/
      error-handler.middleware.ts  # AppError subclasses -> ApiErrorResponse; unknown errors -> 500 + log
    redis/
      client.ts                # ioredis client factory using REDIS_URL, singleton per process
    app.ts                     # express() assembly: helmet, cors (credentials: true, origin: CLIENT_APP_URL),
                                #   cookie-parser(COOKIE_SECRET), express.json(), mount /api/v1/auth routes,
                                #   mount /api/v1/trpc via @trpc/server/adapters/express, error handler last
    server.ts                  # loadEnv(authEnvSchema), createLogger("auth-service"), connectDb(),
                                #   redis client connect, rabbitmq client connect + start consumers,
                                #   http.createServer(app).listen(PORT), graceful shutdown on SIGINT/SIGTERM
                                #   (close server, close db, close redis, close rabbitmq channel/connection)
  tests/
    unit/
      services/
        token.service.test.ts     # mock Redis (ioredis-mock) and time; test rotation + hashing behavior
        session.service.test.ts   # mock Redis; test create/list/revoke
        cache.service.test.ts     # mock Redis; test cache-aside + explicit invalidation on update
      queue/
        welcome-email.consumer.test.ts  # mocked channel; assert email.service called, ack on success, nack+DLQ on failure
        audit-log.consumer.test.ts      # mocked channel; assert audit.service called, ack/nack behavior
    integration/
      auth.routes.test.ts         # supertest against the real Express app, mongodb-memory-server +
                                   #   ioredis-mock, mock google-auth-library's OAuth2Client (no real network),
                                   #   assert cookies set with correct options
      trpc.auth.test.ts           # test tRPC caller (createCallerFactory), assert protectedProcedure
                                   #   rejects without a valid cookie/context
    utils/
      test-app.ts                # builds the app with test-mode config (in-memory mongo uri, mock redis, mock rabbitmq)
      fixtures.ts                # factory functions: buildUser(), buildGoogleProfile()
```

### 5.3 `services/gateway`
```
services/gateway/
  package.json
  tsconfig.json               # extends ../../tsconfig.base.json, references: shared-auth, shared-types,
                               #   shared-config, logger, AND a devDependency-only reference to
                               #   auth-service for the AppRouter type import (§4.1)
  jest.config.ts
  .env.example
  Dockerfile
  src/
    config/
      env.ts                  # gatewayEnvSchema = baseEnvSchema.extend({ JWT_PUBLIC_KEY, COOKIE_SECRET,
                               #   AUTH_SERVICE_URL, CLIENT_APP_URL })
    clients/
      auth-trpc-client.ts      # @trpc/client createTRPCClient<AppRouter>({ links: [httpBatchLink(...)] })
                                #   pointed at AUTH_SERVICE_URL + /api/v1/trpc
      auth-rest-client.ts       # thin fetch wrapper for calling auth-service's REST /api/v1/auth/refresh
                                 #   from buildContext (§4.8) — forwards Cookie + X-Forwarded-For headers,
                                 #   returns { ok, setCookieHeaders, body }
    graphql/
      builder.ts               # new SchemaBuilder<{ Context: GraphQLContext }>(...)
      context.ts                # GraphQLContext type + buildContext(req, res) — verifies cookie,
                                 #   falls back to auth-rest-client refresh flow per §4.8, relays Set-Cookie
      types/
        user.type.ts
        session.type.ts
      resolvers/
        query.resolvers.ts      # me, sessions
        mutation.resolvers.ts    # revokeSession
      schema.ts                  # assembles builder.toSchema()
    rest/
      auth-proxy.routes.ts       # GET /api/v1/auth/google and /google/callback -> redirect/proxy to
                                  #   AUTH_SERVICE_URL equivalents, per §4.6
    middleware/
      rate-limit.middleware.ts   # coarse 100/60s per IP on the GraphQL endpoint, per §4.6
    redis/
      client.ts
    app.ts                       # express() wrapping graphql-yoga's handler at /graphql, mounts
                                  #   auth-proxy REST routes, helmet/cors/cookie-parser same as auth-service
    server.ts                     # same bootstrap pattern as auth-service's server.ts (no rabbitmq/mongo here —
                                   #   gateway has no direct DB access and no background jobs of its own)
  tests/
    unit/
      graphql/
        context.test.ts           # cookie verification -> context.user, invalid token -> null,
                                   #   invalid access + valid refresh -> refresh flow invoked (mock auth-rest-client)
    integration/
      graphql.test.ts             # supertest/graphql-yoga test client; mock the tRPC client and the
                                   #   auth-rest-client (don't hit a real auth-service process in tests);
                                   #   cover the §4.8 auto-refresh success and failure paths explicitly
    utils/
      test-app.ts
```

---

## 6. Required build order — do not reorder

1. `packages/shared-auth` — implement, add to root `tsconfig.json` references, `pnpm --filter @platform/shared-auth build`, confirm `turbo run build` picks it up.
2. `services/auth-service` — implement fully including RabbitMQ producers/consumers and tests. Confirm `pnpm --filter auth-service test` passes and `pnpm --filter auth-service dev` boots (Mongo, Redis, and RabbitMQ connections all succeed, consumers start) and responds on `GET /api/v1/auth/google` without crashing.
3. `services/gateway` — implement, importing `AppRouter` type from auth-service, including the §4.8 auto-refresh flow. Confirm `pnpm --filter gateway dev` boots, and with auth-service also running: a GraphQL `me` query with no cookie returns a clean "unauthenticated" error; a `me` query with an expired access token but valid refresh token succeeds and returns fresh `Set-Cookie` headers.
4. Update root `turbo.json`/`tsconfig.json` references and root `package.json` `dev` script filter (`--filter=./apps/* --filter=./services/*`) so `pnpm dev` starts both services together, reachable via their `*_URL` env vars.
5. Add a `docker-compose.yml` at the repo root (new file) with services: `mongo`, `redis`, `rabbitmq`, `auth-service`, `gateway`, wired with the same env var names used locally. Local `pnpm dev` must keep working without Docker; docker-compose is additive.

At each step, run `pnpm typecheck` and `pnpm test` from the root (via turbo) — don't let type errors or failing tests accumulate across steps.

---

## 7. Testing requirements (apply to both services)

- **Unit tests**: each `services/*.service.ts` and each queue producer/consumer, in isolation, with mocked Redis (`ioredis-mock`), mocked Mongoose models where relevant, and a mocked/fake RabbitMQ channel. No real network calls, no real Mongo/Redis/RabbitMQ connections anywhere in the test suite.
- **Integration tests**: `supertest` against the real Express app (`app.ts`, not `server.ts` — don't bind a real port), `mongodb-memory-server` for Mongo, `ioredis-mock` for Redis, `google-auth-library`'s `OAuth2Client` mocked at the module boundary.
- Every new REST route, tRPC procedure, and GraphQL resolver needs at least one integration test covering the success path and one covering an auth-failure path.
- The §4.8 auto-refresh behavior specifically needs its own integration test (both success and failure branches) — don't let it ride along implicitly inside an unrelated test.
- `jest.config.ts` in both services uses `@swc/jest` (not `ts-jest`).

---

## 8. Environment variables — full list (put in `.env.example` in each service)

**auth-service**: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `MONGODB_URI`, `MONGODB_DB_NAME`, `REDIS_URL`, `RABBITMQ_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `COOKIE_SECRET`, `CLIENT_APP_URL`

**gateway**: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `REDIS_URL`, `JWT_PUBLIC_KEY`, `COOKIE_SECRET`, `AUTH_SERVICE_URL`, `CLIENT_APP_URL`

(Gateway has no `MONGODB_URI` or `RABBITMQ_URL` — zero direct database access and no background jobs of its own, by design.)

For local RSA keypair generation, note in a code comment or README snippet:
```
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```
then pasted into env vars (escape newlines as `\n` if single-line, or read from a file path — pick one approach and be consistent in `env.ts`).

---

## 9. Definition of done

- [ ] `packages/shared-auth`, `services/auth-service`, `services/gateway` all exist, build (`turbo run build`), and typecheck (`turbo run typecheck`) with zero errors.
- [ ] `pnpm dev` at the repo root starts both services concurrently.
- [ ] Manually hitting `GET /api/v1/auth/google` on the gateway redirects to Google's real consent screen.
- [ ] After a manual login, `access_token` and `refresh_token` cookies are present, signed, httpOnly, with correct `sameSite`/`maxAge`.
- [ ] A GraphQL `me` query with a valid cookie returns the user; without one, returns a clean auth error, not a 500 or crash.
- [ ] A GraphQL `me` query with an **expired access token but a valid refresh token** transparently succeeds and the response carries fresh `Set-Cookie` headers — no separate frontend refresh call needed.
- [ ] `POST /api/v1/auth/refresh` rotates the refresh token — old one no longer works if reused (verify this is actually enforced).
- [ ] `POST /api/v1/auth/logout` (or the `revokeSession` GraphQL mutation) removes the Redis session and clears cookies.
- [ ] A new user's first Google login enqueues and processes an `AUTH_WELCOME_EMAIL` job (visible in logs); subsequent logins by the same user do not re-enqueue it.
- [ ] Login/logout/refresh/session-revoke each enqueue and process an `AUTH_AUDIT_LOG` job, and a corresponding `AuditLog` document appears in Mongo.
- [ ] Killing and restarting RabbitMQ (or auth-service) does not lose durable queue messages that were already published.
- [ ] All unit and integration tests pass (`turbo run test`) with no real external network calls in the test suite.
- [ ] `docker-compose.yml` at the root brings up mongo + redis + rabbitmq + both services, and the same manual checks above work against the containerized version.

---

## 10. Explicit non-goals for this task

- Do not touch `packages/logger`, `packages/shared-types`, or `packages/shared-config` except to add `PUBSUB_CHANNELS.AUTH_EVENTS` and `QUEUE_NAMES.AUTH_WELCOME_EMAIL` / `QUEUE_NAMES.AUTH_AUDIT_LOG` if missing.
- Do not build `repo-service`, `indexing-service`, `orchestrator-service`, `chat-service`, or `notification-service` — those come later. Structure the gateway's GraphQL schema so adding their resolvers later is additive, but don't stub them out now.
- Do not build a separate RabbitMQ worker service — consumers live inside `auth-service`'s own process for this task.
- Do not introduce Passport.js or `express-session` — this is stateless-JWT-plus-Redis-session-registry by design.
- Do not use `jsonwebtoken` — use `jose`.
- Do not implement a real email provider for the welcome-email job — stub/log it behind an interface.
- Do not weaken the REST/tRPC split to make the auto-refresh feature easier — the refresh call must go through auth-service's REST endpoint (per §4.8), not through a new tRPC mutation that writes cookies.
