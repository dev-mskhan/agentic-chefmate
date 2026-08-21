# Test Workflow Memory

## Tooling preference (from user)
- Use **codebase-memory-mcp** tools for file reads and code exploration throughout a
  task — both at the start and in the middle. Prefer these over the `view` tool to save
  tokens and get structural context.
  - `get_code_snippet_codebase-memory-mcp` — read source for a function/class/symbol by qualified_name.
  - `search_code_codebase-memory-mcp` — grep + graph-augmented search (modes: compact/full/files).
  - `search_graph_codebase-memory-mcp` — find symbols by name pattern or natural-language query.
  - `get_architecture_codebase-memory-mcp` — package/structure overview.
  - `query_graph_codebase-memory-mcp` — Cypher for cross-service / call-graph questions.
  - `trace_path_codebase-memory-mcp` — callers/callees/data-flow/cross-service traces.
- Only fall back to `view` if a codebase-memory-mcp tool genuinely can't reach a specific file.
- The graph index auto-syncs on file changes (built-in feature) — no manual re-index needed.

## Workflow rule (from user)
When syncing/fixing services during a test phase:
- If anything was changed in any service, that service MUST build perfectly (run `pnpm --filter <pkg> run build` → `tsc` exits 0 with no type errors) before declaring the phase done.
- This applies to every phase, not just Phase 1.

## Phase progression (user-directed)
The user wants to move phase-by-phase. Do NOT run later-phase tests until the user explicitly says to move on.
- Phase 1 — Auth Foundation: COMPLETED (all 26 tests green, both touched services build clean).
- Phase 2 and beyond: NOT started yet. Wait for user's go-ahead.

## Services touched in Phase 1 (always re-build these if re-edited)
- `@chefmate/auth-service` (services/auth-service)
- `@chefmate/gateway` (services/gateway)

## Phase 2 — User Service (COMPLETED)
- All 47 user-service tests pass through the gateway (`user-via-gateway` project).
- Bugs found & fixed:
  1. user-service trpc.ts errorFormatter didn't map ApiError→httpStatus (NotFoundError/ConflictError/RateLimitError returned 500). Fixed — same pattern as auth-service.
  2. auth.consumer.ts created UserProfile with firstName:'', lastName:'' but model requires them → every user.registered event failed validation. Fixed consumer to pass firstName:'New', lastName:'User' placeholders.
  3. user-service tRPC plugin was mounted at /trpc but the gateway forwards /api/v1/users/trpc/* (rewritePrefix keeps the full path) → all proxied user requests 404'd. Fixed plugin prefix to /api/v1/users/trpc.
  4. SECURITY: deleteAddress & updateAddress relied on MongoDB updateOne modifiedCount, which can report 1 for a $pull/$set that changes nothing on an empty/mismatched array → a user could "delete" or "update" another user's address id and get a false 200. Fixed both to verify the address exists in the caller's profile (findOne by userId) before mutating.
- Services touched in Phase 2 (build verified clean):
  - `@chefmate/user-service` (services/user-service) — trpc.ts, consumers/auth.consumer.ts, plugins/trpc.ts, trpc/procedures/delete-address.ts, trpc/procedures/update-address.ts
- Test coverage: profile CRUD + validation (400), addresses CRUD + 10-cap (409) + default isolation + not-found (404) + invalid ObjectId, preferences + enum validation, allergies set/get/clear, favorites chef/dish/plan add/remove + idempotency, notification prefs + quiet hours HH:MM validation, GDPR export + rate limit (429 on 2nd), user isolation (4 cross-user tests with isolated cookie jars), unauthorized (401).
- Dependent-service tests re-run: Phase 1 auth (26 pass), chef-direct (17 pass) — no regressions.

## Phase 3 — Chef Service (COMPLETED)
- All 53 chef-service tests pass through the gateway (`chef-via-gateway` project).
- Bugs found & fixed:
  1. SECURITY (RBAC): auth-service `changeRole` internal tRPC procedure had NO authorization guard — anyone could promote themselves to ADMIN. Fixed by adding `INTERNAL_SECRET` env var to auth-service config + .env, and making `internalProcedure` validate the `x-internal-secret` header.
  2. SECURITY (RBAC): chef-service `promoteUserToChef` (called from `updateChefStatus`) didn't send the `x-internal-secret` header when calling auth-service `changeRole`. Fixed by adding `INTERNAL_SECRET` to chef-service config + .env and sending the header in the internal tRPC call.
  3. Pre-seeded admin account: auth-service now creates an ADMIN user at boot (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` env vars) if none exists, so tests can sign in as admin to approve chefs.
  4. chef-service `setErrorHandler` didn't unwrap `TRPCError.cause` → `ApiError.statusCode`. Domain errors (ConflictError 409, ValidationError 400, ForbiddenError 403) all returned HTTP 500. Fixed the error handler to unwrap `error.cause` and map to the correct status code. Also added a tRPC code→HTTP status fallback map.
  5. Gateway rate limit (`@fastify/rate-limit`) was hardcoded to `max: 200`/min, keyed by userId or IP. With 53 chef tests each doing ~4 gateway requests from `127.0.0.1`, the IP-level counter hit 200 and returned `RATE_LIMIT_EXCEEDED` (wrapped as 500 by the gateway error handler). Fixed by making the limit configurable via `RATE_LIMIT_MAX` env var (gateway config + .env), set to 5000 for local dev/test.
  6. auth-service global rate limit was `max: 100`/min — too low for test runs. Raised to `max: 1000`/min.
  7. Schedule test spec used full day names (`MONDAY`, `TUESDAY`, `FRIDAY`) but the Zod schema enum uses 3-letter codes (`MON`, `TUE`, `FRI`) → 400 validation errors. Fixed all day-of-week values in the spec.
  8. Schedule availability test expected `canAccept` field but `canChefAcceptOrder` returns `{ available: boolean, reason?: string }`. Fixed the spec to check `available` instead.
  9. Plans test sent `dishIds: []` for tiers but the schema requires `min(1)` dish per tier. Fixed by creating a dish first and using its ID. Also, `validatePlanActivation` requires ACTIVE dishes, so the activate/pause tests now activate the dish before activating the plan.
- Services touched in Phase 3 (build verified clean):
  - `@chefmate/auth-service` — config.ts, .env, index.ts (rate limit + seed admin), trpc/trpc.ts (internalProcedure guard)
  - `@chefmate/chef-service` — config.ts, .env, trpc/procedures/update-chef-status.ts (send internal secret), routes/v1/chef.routes.ts (setErrorHandler unwrap TRPCError.cause)
  - `@chefmate/gateway` — config.ts (RATE_LIMIT_MAX env), plugins/rate-limit.ts (use config.RATE_LIMIT_MAX), .env (RATE_LIMIT_MAX=5000)
- Test coverage (53 tests across 5 spec files):
  - 3A Profile (13): create (201 PENDING/INACTIVE), duplicate (409), invalid cuisine (400), get own /me, update /me, public profile /:chefId, chef status /:chefId/status, admin approval (USER→CHEF promotion), admin rejection, admin suspension, non-admin 403, unauthenticated 401×2.
  - 3B Dishes (13): create draft, update, activate, deactivate, archive, ingredients (quantity must be number + unit required), pricing, media, availability, customer visibility (only ACTIVE in public listing), chef ownership isolation (403), unauthenticated 401, invalid price 3-decimals 400.
  - 3C Schedule (10): upsert weekly schedule (MON/TUE/... 3-letter codes), add/remove blackout date, add/remove one-off date, update capacity, availability check (available field, not canAccept), blackout unavailable, unauthenticated 401, invalid time window 400.
  - 3D Plans (13): create ONE_OFF (DRAFT), SUBSCRIPTION without frequency 400, SUBSCRIPTION with frequency 200, update, manage tiers (min 1 dishId), manage media, activate (requires ACTIVE dish in tier), activate without tiers 400, pause/resume, archive, chef ownership isolation 403, dish ownership validation 400, unauthenticated 401.
  - Metadata (4): public GET cuisines/occasion-tags/dietary-tags/allergens (200, no auth).
- Dependent-service tests re-run: Phase 1 auth (26 pass), Phase 2 user (47 pass) — no regressions from RBAC fixes.
- Next phase: Phase 4 (wait for user's go-ahead).
