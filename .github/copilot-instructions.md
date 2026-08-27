# ChefMate Copilot Instructions

## Repository shape

ChefMate is a pnpm 11 monorepo orchestrated by Turbo:

- `apps/web` is the React 19 + TypeScript + Vite frontend.
- `services/*` are independently runnable Fastify/TypeScript backend services.
- `packages/*` contain shared configuration, MongoDB helpers, errors, logging,
  tRPC helpers, auth clients, and Kafka/Redpanda event contracts.
- `tests/api` contains Playwright API and journey tests.
- `infra/docker-compose.yml` runs local MongoDB, Redis, Redpanda, Redpanda
  Console, and MinIO. Application services run separately.

Read `.frontend/CONTEXT.md`, `.frontend/DESIGN.md`, `.frontend/PLAN.md`, and
`.frontend/tasks.md` before changing the web app. These documents define the
product flows, gateway API shapes, Warm Hearth visual system, frontend
architecture, phase scope, and acceptance checklist.

## Build, lint, and test commands

Run commands from the repository root with pnpm.

```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d

pnpm build                    # Turbo build for all packages/services/apps
pnpm lint                     # Turbo lint (currently primarily apps/web)
pnpm --filter web build
pnpm --filter web lint
pnpm --filter @chefmate/chef-service build
pnpm --filter @chefmate/chef-service dev
pnpm --filter @chefmate/gateway dev
pnpm --filter web dev
```

Unit tests use Vitest in the packages/services that define a `test` script:

```powershell
pnpm --filter @chefmate/trpc test
pnpm --filter @chefmate/chef-service test
pnpm --filter @chefmate/chef-service exec vitest run src/dish.test.ts
pnpm --filter @chefmate/chef-service exec vitest run -t "specific test name"
```

API tests use Playwright and assume the required infrastructure plus the
gateway and dependent services are running. Tests intentionally call the
gateway rather than individual services so cookies, auth verification, role
gating, and proxy behavior are exercised:

```powershell
pnpm test:api
pnpm test:api:auth
pnpm test:api:gateway
pnpm --filter @chefmate/api-tests exec playwright test tests/auth/auth.spec.ts
pnpm --filter @chefmate/api-tests exec playwright test -g "specific test name"
pnpm --filter @chefmate/api-tests exec playwright test --debug
```

Copy `.env.example` to `.env` and provide valid local values, including JWT
keys and service URLs. Service configuration is validated at boot with Zod.

## Architecture and request flow

The public request path is:

```text
React web app -> gateway (:3000) -> role/auth proxy -> backend service
```

The frontend must call the gateway, never individual backend services. Gateway
prefixes include `/api/v1/auth`, `/users`, `/chefs`, `/orders`, `/payments`,
`/subscriptions`, `/reviews`, `/chat`, `/notifications`, `/payouts`,
`/user-dashboard`, `/chef-dashboard`, `/admin`, and `/media`. Public discovery
and search routes are configured separately in
`services/gateway/src/config/routes.yaml`; route ordering matters because
prefix matching and auth gates are order-sensitive.

Each backend service normally has a `src/index.ts` Fastify bootstrap, a Zod
config module, MongoDB/Redis plugins as needed, REST route modules, and tRPC
routers/procedures where domain operations are exposed through tRPC. Use the
shared packages instead of reimplementing infrastructure:

- `@chefmate/config` loads service-local `.env` first, then the root `.env`,
  and validates environment variables.
- `@chefmate/db` owns MongoDB connection utilities.
- `@chefmate/errors` provides domain errors and the standard HTTP response
  conversion.
- `@chefmate/trpc` flattens native tRPC responses into the common
  `{ statusCode, data, message }` envelope.
- `@chefmate/logger` provides structured Fastify/application logging.
- `@chefmate/event-contracts` is the source of truth for Kafka topics and
  typed event payloads.

Services communicate asynchronously through Redpanda/Kafka. Consumers should
use the shared typed consumer factory and event types. Event handlers commonly
need idempotency because events may be retried or delivered more than once.
The notification service derives deterministic notification IDs, uses BullMQ
per delivery channel, persists in-app notifications in MongoDB, and publishes
real-time delivery through Redis pub/sub/WebSocket paths.

## Codebase conventions

- Preserve the standard error path: throw/use domain errors and let the
  service or gateway error handler convert them with `toHttpResponse`; do not
  create ad-hoc response formats or swallow failures.
- Keep service boundaries intact. Put shared contracts/utilities in
  `packages/*`; do not import another service's private implementation.
- Keep authenticated browser requests cookie-based with
  `credentials: 'include'`. The gateway injects identity headers such as
  `x-user-id`, `x-user-role`, and `x-user-email` for downstream services.
- Treat REST routes as the public-friendly surface and tRPC routers as the
  domain procedure surface. Follow existing route prefixes and response
  envelopes when adding endpoints.
- Load configuration through `loadEnv(__dirname)` and the service's validated
  `config`; do not read `process.env` directly throughout business logic.
- Register and disconnect Kafka consumers, Redis clients, workers, and MongoDB
  connections during graceful shutdown, following the existing service
  bootstrap pattern.
- For frontend work, keep backend-shaped types/envelopes and isolate data
  access behind `src/services/` API functions. Current fixtures are
  deterministic JSON in `apps/web/src/services/mock/fixtures/` so switching to
  the gateway remains a seam/configuration change.
- Frontend role surfaces are distinct: public/customer, chef, and admin shells.
  Auth pages use `AuthShell` only; do not add the main navigation or footer to
  auth screens. Do not add links to routes that are not implemented yet.
- Frontend visible copy must not expose fixture implementation language such as
  “demo”, “mock”, or “sample data”. Follow `.frontend/COPY.md` for wording and
  translation-safe copy.
- Frontend motion uses GSAP 3/ScrollTrigger; do not introduce a second motion
  engine. Respect `prefers-reduced-motion`, keep CTAs interactive during
  animation, and follow the Warm Hearth tokens and status-color mapping in
  `.frontend/DESIGN.md`.
- Update `.frontend/tasks.md` only when the relevant phase task is fully
  complete and its acceptance checklist is satisfied.

## Working safely in this repository

When changing a service, inspect its `config.ts`, `src/index.ts`, plugins,
routes, tRPC procedures, models, and related tests together. When changing an
API contract, update the shared event/type definitions and the gateway-facing
tests or service tests that exercise it. For end-to-end behavior, test through
the gateway and use the service's direct unit tests only for isolated logic.
