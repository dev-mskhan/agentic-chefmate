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

## Phase 4 — Media Service Tests (COMPLETED)
- All 30 media tests pass through the gateway (`media-via-gateway` project): 25 media.spec.ts + 5 chef-media-sync.spec.ts.
- Dependent-service tests re-run: Phase 1 auth (26 pass), Phase 3 chef (53 pass) — no regressions.
- Services touched in Phase 4 (build verified clean — tsc exits 0):
  - `@chefmate/media-service` (services/media-service) — .env (PORT 3004→3007), src/config.ts (MEDIA_SERVICE_URL + INTERNAL_SECRET), src/routes/v1/media.routes.ts (internal validate-media route)
  - `@chefmate/chef-service` (services/chef-service) — .env (MEDIA_SERVICE_URL + INTERNAL_SECRET), src/config.ts (schema + defaults), src/index.ts (boot ordering), src/trpc/procedures/manage-dish-media.ts + manage-plan-media.ts (ownership validation), src/services/media-validation.service.ts (new), src/consumers/media.consumer.ts (new)
  - `@chefmate/gateway` (services/gateway) — .env (MEDIA_SERVICE_URL), src/config.ts (schema), src/config/routes.yaml (media prefix)
  - `@chefmate/api-tests` (tests/api) — playwright.config.ts (media-via-gateway project), helpers/media.ts, tests/media/media.spec.ts, tests/media/chef-media-sync.spec.ts
- Bugs found & fixed:
  1. **Port conflict**: media-service .env used PORT=3004 which clashes with order-service. Gateway config expects media-service at :3007. Changed .env PORT to 3007.
  2. **media-service had no internal ownership-validation route** — chef-service couldn't verify a mediaId belongs to a chef before attaching it to a dish/plan. Added `POST /api/v1/media/internal/validate-media` (guarded by x-internal-secret) that returns `{ mediaId, valid, reason }` per id.
  3. **chef-service manageDishMedia/managePlanMedia blindly accepted any mediaId** — security/consistency hole (chef could attach another chef's media, or a non-existent id). Both procedures now call `validateMediaOwnership(mediaIds, userId)` and throw 400 if any id is not owned / not READY / not found.
  4. **No event-driven cleanup** — when a media asset is deleted in media-service, dishes/plans/profiles still referenced the dead mediaId. Added `media.consumer.ts` subscribing to `media.events` topic; on `media.deleted` it `$pull`s the mediaId from Dish.mediaIds, MealPlan.mediaIds, ChefProfile.portfolioMediaIds.
  5. **media-service uses `ts-node` not `tsx watch`** — does NOT auto-reload on source edits. After editing media.routes.ts I had to kill the old process (PID on :3007) and restart `pnpm --filter @chefmate/media-service run dev` for the new internal route to appear. Lesson: restart media-service after any source change.
  6. **chef-media-sync test #5 (event sync) used wrong endpoint** — tried `dishes.find()` on a paginated object response. Fixed to use `GET /:chefId/dishes?limit=100` and extract the array from `data` / `data.items` / `data.dishes`.
- Test coverage (media.spec.ts): request upload URL (201), upload to MinIO via signed PUT, admin confirm READY (200), get metadata (200), get download URL (200), delete (200, DELETED), invalid MIME (400), oversized image >10MB (400), oversized video >100MB (400), valid video MIME (201), unauthorized download (401), another user cannot get metadata/download/delete (403), non-admin cannot confirm READY (403), non-existent mediaId (404), unauthenticated (401), expired signed URL, confirm FAILED, invalid state transition READY→READY (400), invalid status enum (400).
- Test coverage (chef-media-sync.spec.ts): attach valid own mediaId to dish (200), attach another chef's mediaId (400 not owned), attach non-existent mediaId (400 not found), attach UPLOADING-state mediaId (400), delete media removes it from dish.mediaIds via media.events consumer (3s propagation wait).

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

## Architecture Audit (performed after Phase 4, before starting Phase 5)
Full cross-service audit of (1) request flow, (2) event wiring, (3) gateway↔service route sync.
Verdict: NO blockers for continuing phased testing. Architecture is clean; security boundaries are correct.

### Flow — CORRECT
- Gateway centralizes auth: verifies JWT (JWKS cached in Redis), checks token blacklist for revoked sessions, enforces per-route role gating. Downstream services never touch the raw token.
- Header injection: `auth-verify.ts` sets `x-user-id` / `x-user-role` / `x-user-email` on every authenticated request; downstream services read them via `extractPrincipal()`. Consistent across auth/chef/user/media services.
- Internal secret stripping: gateway `proxy.ts` deletes `x-internal-secret` from ALL proxied request headers → clients cannot forge service-to-service calls through the gateway. Only direct network calls between services can carry the secret. Correct security boundary.
- Service-to-service calls go DIRECT (not through gateway): chef-service → media-service (`validateMediaOwnership` via MEDIA_SERVICE_URL), chef-service → auth-service (`promoteUserToChef` via AUTH_SERVICE_URL). Both send x-internal-secret directly. This is the recommended pattern (user confirmed "Direct service-to-service").
- Minor note (NOT a bug): gateway proxies all of /api/v1/media/* to media-service, so /api/v1/media/internal/validate-media is technically reachable through the gateway — but the gateway strips x-internal-secret, so such requests get 401. Safe by design. Could add an explicit exclusion for /api/v1/media/internal/* in the gateway later if desired, but not required.

### Event Wiring — CORRECT (one forward-looking gap noted)
Producer→Topic map (all verified publishing correctly):
- auth-service → auth.events (user.registered, logged_in/out, email_verified, password_reset_requested, password_changed, role_changed, deleted)
- chef-service → chef.events (chef.created/updated/onboarded/approved/suspended, dish.created/updated/archived, plan.created/updated/activated, etc.)
- media-service → media.events (media.uploaded, ready, failed, deleted)
- order-service → order.events; review-service → review.events; payment-service → payment.events; subscription-service → subscription.events; notification-service → notification.events

Consumer→Topic map (verified wiring):
- user-service consumes auth.events: user.registered → create UserProfile (idempotent via 11000 dup-key catch); user.deleted → delete UserProfile + invalidate cache
- chef-service consumes review.events: review.published / review.status_changed → recalc averageRating/totalReviews on ChefProfile/Dish/MealPlan (CQRS read-optimized aggregates)
- chef-service consumes media.events: media.deleted → $pull mediaId from Dish.mediaIds / MealPlan.mediaIds / ChefProfile.portfolioMediaIds
- notification-service consumes auth/order/chef/chat/payment/subscription/notification events (central sink → BullMQ per-channel queues)
- order-service consumes payment.events; review-service consumes order.events; subscription-service consumes payment.events

Verified correct:
- media.failed does NOT need chef-service cleanup — validateMediaOwnership requires status:READY, so a failed mediaId can never be attached to a dish/plan. No orphaned references possible. ✅
- Consumer group isolation: each consumer uses a distinct groupId (chef-service-reviews, chef-service-media, notification-service-auth, etc.) → multiple consumers read the same topic independently. ✅
- Idempotency: user-service handles dup user.registered (11000 catch); review consumer uses upsert:true; media consumer uses $pull (idempotent). ✅

FORWARD-LOOKING GAP (not a current bug, note for a future phase):
- `user.events` topic (user.profile_updated, user.preferences_updated, user.deleted) is defined in event-contracts but NO service currently subscribes to it. notification-service (the central sink) subscribes to 7 topics but NOT user.events. Likely an unimplemented consumer for a later phase — e.g., notification-service might need to update notification prefs from user.preferences_updated, or chef-service might sync displayName from user.profile_updated. Flag this when reaching the relevant phase.

### Route Sync — CORRECT for all active routes; 10 future routes pre-wired (expected to 404/502 until their phase)
Fully in sync (gateway prefix ↔ downstream service route prefix):
- /api/v1/auth ↔ auth-service ✅
- /api/v1/users ↔ user-service ✅
- /api/v1/chefs + /api/v1/chefs/meta ↔ chef-service ✅
- /api/v1/media ↔ media-service ✅
- /api/v1/orders ↔ order-service ✅
- /api/v1/subscriptions ↔ subscription-service ✅
- /api/v1/payments + /api/v1/payments/webhook ↔ payment-service ✅
- /api/v1/reviews + /api/v1/reviews/public ↔ review-service ✅

FUTURE ROUTES — gateway pre-wired, downstream NOT yet implemented (verify when reaching each phase):
- /api/v1/discovery/chefs  → CHEF_SERVICE_URL       — chef-service has no /discovery/* routes yet
- /api/v1/discovery/dishes → CHEF_SERVICE_URL       — same
- /api/v1/search/chefs     → CHEF_SERVICE_URL       — same
- /api/v1/search/dishes    → CHEF_SERVICE_URL       — same
- /api/v1/search/meal-plans→ CHEF_SERVICE_URL       — same
- /api/v1/payouts          → PAYOUT_SERVICE_URL     — payout-service has no HTTP routes registered yet
- /api/v1/admin            → ADMIN_SERVICE_URL      — admin-service has no HTTP routes registered yet
- /api/v1/notifications    → NOTIFICATION_SERVICE_URL — notification-service is worker-only (no Fastify HTTP server). When this phase starts, need to add an HTTP server to notification-service OR decide these notifications are only delivered via push/in-app (no REST API).
- /api/v1/user-dashboard   → DASHBOARD_SERVICE_URL  — no dashboard service exists yet
- /api/v1/chef-dashboard   → DASHBOARD_SERVICE_URL  — same

CHAT-SERVICE WATCH-ITEM (verify when reaching chat phase):
- chat-service uses socket.io (ioPlugin) + tRPC but its index.ts registers NO explicit HTTP route prefix.
- Gateway proxies /api/v1/chat to it. When reaching the chat phase, verify:
  (1) the tRPC plugin is mounted at /api/v1/chat/trpc (same pattern as the Phase 2 user-service fix — user-service tRPC was at /trpc but gateway forwards /api/v1/users/trpc/*, so the plugin prefix had to be changed to /api/v1/users/trpc).
  (2) ws-proxy.ts correctly handles the WebSocket upgrade for the socket.io connection.
