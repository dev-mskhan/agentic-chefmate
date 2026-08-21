# Test Workflow Memory

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
- Next phase: Phase 3 (wait for user's go-ahead).
