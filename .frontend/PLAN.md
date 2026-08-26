# ChefMate Frontend Implementation Plan (v2)

This replaces the previous PLAN.md. It exists to remove ambiguity that was
causing Copilot to invent random pages, use placeholder/demo wording in
real UI, add nav/footer to auth pages, and build phases that don't connect
to each other. Read this file fully before starting any task — it overrides
any conflicting assumption Copilot makes on its own.

Primary references, read in this order before any phase:

1. `.frontend/CONTEXT.md` — product, domain, routes, models, API shapes
2. `.frontend/DESIGN.md` — Warm Hearth visual system and motion rules
3. `.frontend/PLAN.md` — this file: architecture, rules, phases
4. `.frontend/tasks.md` — task tracker; mark a task `done` only after its
   acceptance checklist (below) is fully satisfied

---

## 0. Non-negotiable global rules

These apply to every phase, every page, every component. If a task's own
instructions seem to conflict with these, these rules win.

### 0.1 No demo/mock wording anywhere in visible UI

This is a real product build using placeholder **data**, not a placeholder
**product**. The UI must never let the mock-data layer leak into copy.

Forbidden anywhere a user can read it (headings, body copy, empty states,
buttons, tooltips, alt text, toasts, placeholder text in inputs):

- "demo", "Demo", "DEMO"
- "mock", "Mock"
- "sample data", "sample account", "placeholder data"
- "Warm Hearth demo" or any theme-name-as-product-name phrasing
- Any sentence that describes the app to itself (e.g. "Create a demo
  account to save chefs, build a cart, and follow the food home.") —
  write real marketing/product copy the way an actual shipped consumer
  app would, as if the data were live.

Correct approach: write copy as if talking to a real customer/chef about
real food and real orders. "Save your favorite chefs" not "Create a demo
account to save chefs." The fact that the numbers behind it are fixtures
is invisible to the UI layer entirely.

This rule does not restrict internal/engineering artifacts: file names,
code comments, `services/mock/`, `tasks.md`, this plan, and PR descriptions
may say "mock" freely. Only user-visible strings are restricted.

### 0.2 Mock data rules

- Mock data is **static, hand-authored JSON fixtures**, one file per
  entity, matching the field names, enums, nesting, and relationships in
  `.frontend/CONTEXT.md` exactly — not simplified, not renamed, not
  restructured for developer convenience.
- Fixtures live in `src/services/mock/fixtures/` (e.g. `chefs.json`,
  `dishes.json`, `mealPlans.json`, `orders.json`, `subscriptions.json`,
  `reviews.json`, `notifications.json`, `payouts.json`).
- Fixtures must cross-reference each other by real IDs (a dish's `chefId`
  must match an actual chef in `chefs.json`; an order's `dishId`s must
  exist; etc.) so the UI is exercised the same way it will be against the
  real gateway later.
- Every enum value defined in CONTEXT.md must appear at least once across
  the fixtures for that entity (e.g. every order status, every dish
  status, every payout state) so every UI state actually gets rendered
  and reviewed, not just the happy path.
- Fixtures are read through `src/services/` functions with the same
  function signatures the real gateway client will use later (e.g.
  `getChefById(id)`, `discoverDishes(filters)`), returning
  backend-shaped response envelopes (pagination, etc.) — not raw arrays.
  This is what makes Phase 7's gateway swap a config change instead of a
  rewrite.
- No `Math.random()` fixture generation, no faker libraries. Fixed,
  reviewable, deterministic JSON only, so the same UI review always shows
  the same thing.

### 0.3 Page/route scope

Each phase below lists the pages/routes it owns. Treat the list as the
**primary scope**, not a hard ceiling — Copilot may add a page only if:

- it is a sub-state of a listed page (e.g. a listed page's empty/error/
  loading variant, not a new route), or
- it is clearly required to make a listed page's primary user flow work
  end-to-end (e.g. a listed "checkout" page reasonably implies an order
  confirmation view even if not separately itemized), and
- it does not belong to a *later* phase's domain (e.g. do not add chef
  dashboard pages while working Phase 2).

If genuinely unsure whether something is in scope, it should be flagged
in `tasks.md` as a question rather than built speculatively.

### 0.4 Phase wiring — no dead ends, no fake placeholders

- Every phase must leave the app in a fully working, navigable state
  using only what has actually been built so far.
- Navigation, footer links, and CTAs must **never** point to a route that
  doesn't exist yet. Do not add "Coming soon" placeholder pages either —
  both create fake-feeling product surfaces.
- Instead: nav items, footer links, and CTAs for not-yet-built sections
  simply do not render until the phase that builds them lands. A nav
  component's link list is data-driven off what's implemented, not
  hardcoded to the full future sitemap on day one.
- When a later phase adds a section, it is responsible for updating the
  shared nav/footer to reveal the new links — this is an explicit step in
  that phase's task, not an afterthought.
- Every new page must be reachable by an actual click path from an
  already-existing page (or the URL bar), and tested that way, before its
  task is marked done.

### 0.5 Auth pages: no main nav/footer

Signup, login, forgot-password, reset-password, verify-email, and any
other standalone auth screens use a dedicated `AuthShell`, never the main
site nav/footer.

`AuthShell` = split-screen layout:

- One side (form side, ~45–50% width on desktop, full width on mobile):
  the form itself, ChefMate wordmark/logo top-left linking to `/`, plain
  cream background.
- Other side (desktop only, hidden below ~900px): full-height brand
  imagery/photography from the Warm Hearth visual language (food photo or
  editorial crop), optionally with a short line of brand copy overlaid —
  no nav, no footer, no marketing links.
- No footer on either side at any breakpoint.
- OAuth entry points, "back to home" link (via the logo only), and legal
  links (terms/privacy, small text) may appear beneath the form — nothing
  else.

This shell is a Phase 1 deliverable (`AuthShell` template) and is reused
by every auth-related page in later phases; it is not rebuilt per page.

### 0.6 Acceptance checklist (applies to every task below)

A task is not `done` until all of these are true. `tasks.md` entries
should reference this checklist rather than repeating it.

- [ ] All routes/pages listed for the task exist and are reachable via a
      real click path from already-built UI (see 0.4).
- [ ] All backend-defined states used by the task's data are represented
      in the fixtures and demonstrably rendered (loading, empty, error,
      and every relevant enum value — see 0.2).
- [ ] No forbidden wording anywhere in rendered UI text (see 0.1) —
      search the rendered output, not just the source, since copy can be
      composed from variables.
- [ ] Auth pages (if touched) use `AuthShell` only — no main nav/footer.
- [ ] Responsive at mobile/tablet/desktop per DESIGN.md card/grid/image
      rules; no layout breakage at standard breakpoints.
- [ ] Keyboard-navigable and passes basic focus-visibility check.
- [ ] No new page/nav link was added outside this task's declared scope
      without a corresponding note in `tasks.md`.
- [ ] Build and lint pass with no new errors/warnings introduced.

---

## 1. Architecture

```text
apps/web/src/
├── components/
│   ├── atoms/          # Button, Badge, Input, Icon, Spinner, Avatar, etc.
│   ├── molecules/      # SearchBar, FilterGroup, StatCard, DishCard, etc.
│   ├── organisms/      # Navs, grids, tables, checkout, dashboards
│   └── templates/      # PublicShell, AuthShell, CustomerShell, ChefShell, AdminShell
├── pages/              # Lazy route entries by product surface
├── hooks/              # Auth, media, motion, pagination, responsive helpers
├── lib/                # Router, stores, RTK Query, GSAP setup
├── services/
│   ├── mock/
│   │   └── fixtures/   # JSON fixtures, one file per entity (see 0.2)
│   └── api/            # Function signatures matching future gateway calls
├── styles/              # Tailwind entry, tokens, base layers
├── types/               # Backend-compatible domain/API contracts
└── utils/               # Formatting, statuses, validation, constants
```

## 2. Technology and quality constraints

- Vite, React, TypeScript, Tailwind CSS, GSAP 3 + ScrollTrigger, Redux
  Toolkit Query (pointed at `services/mock` for now), Zustand for
  client-only state, Recharts for charts.
- Performance first: route-level code splitting, lazy media, explicit
  image dimensions, font-conscious loading (see DESIGN.md §1.2/§3), stable
  selectors, memoized lists, bounded caches.
- `Suspense` fallbacks, error boundaries, semantic HTML, visible focus,
  keyboard navigation, responsive layouts, reduced-motion support.
- GSAP is the only animation engine. Marketing pages use full Warm Hearth
  choreography (DESIGN.md §3); authenticated shells use only chart
  draw-ins, short stat tick-ups, and ≤150ms CSS transitions (DESIGN.md §5).
- Services layer is written against the future gateway contract now
  (`credentials: 'include'`-shaped function signatures, base paths from
  CONTEXT.md §3) even though it currently reads JSON fixtures — this is
  what makes Phase 7 a config swap.

---

## 3. Phases

Each phase ends with the app in a complete, navigable state (0.4). Do not
start a phase's tasks out of order unless a dependency note says otherwise.

### Phase 1 — Foundation and design system

**Owns:** no user-facing routes yet; shells and primitives only.

1. `[P1-T1]` Replace the Vite starter with the folder structure in §1, app
   entry, router/provider composition, error boundary, responsive baseline.
2. `[P1-T2]` Configure Tailwind + Warm Hearth tokens from DESIGN.md §1
   (color, type, spacing, radius, shadows, status colors, focus states,
   reduced motion).
3. `[P1-T3]` Build atoms: Button, Link, Icon, Input, Select, Textarea,
   Checkbox, Badge, Avatar, Spinner, Skeleton, EmptyState, Modal, Toast, Image.
4. `[P1-T4]` Build shared templates: `PublicShell` (nav + footer, data-driven
   link list per 0.4), `AuthShell` (split-screen per 0.5), plus shared
   organisms: sticky nav, breadcrumbs, search/filter controls, pagination,
   data table, stat card, date range picker, page containers.

**Phase exit:** no starter UI remains; app builds and runs; `PublicShell`
renders with an empty/minimal nav (nothing to link to yet is fine — this
phase has no pages); `AuthShell` is reviewable in isolation (e.g. via a
temporary story/route) even though no auth page uses it yet.

### Phase 2 — Auth-free public product experience

**Owns:** `/`, `/discover`, `/chefs/:chefId`, `/dishes/:dishId`,
`/plans/:planId`, `/cart`, `/checkout` (preview + confirmation).

1. `[P2-T1]` Author mock fixtures and `services/mock` + `services/api`
   function seams for chefs, dishes, meal plans, and reviews per §0.2.
2. `[P2-T2]` Build the landing page (real product copy, no forbidden
   wording — see 0.1) with every CTA wired to a real destination that
   exists by the end of this phase; apply DESIGN.md §3 motion.
3. `[P2-T3]` Build discovery for chefs, dishes, meal plans: URL-backed
   filters, backend-shaped result rows/pagination, loading/empty/error
   states using real fixtures (including a genuine "no results" fixture
   scenario, not just an artificial empty array).
4. `[P2-T4]` Build chef/dish/meal-plan detail pages: reviews, media,
   availability, related content; favorites UI exists and updates local
   state (no auth yet — favoriting works optimistically client-side).
5. `[P2-T5]` Build the one-chef cart and checkout preview: delivery date,
   address selection (fixture addresses), coupon validation against
   fixture coupons, pricing preview, payment placeholder, idempotency
   note, and a real confirmation page/state.

**Phase exit:** update `PublicShell` nav/footer to include Discover, and
any other links this phase makes real. A visitor can go landing → discover
→ chef/dish/plan detail → cart → checkout preview → confirmation, entirely
through real click paths, with zero dead links and zero forbidden wording.

### Phase 3 — Customer identity and user-service experience

**Owns:** `/signup`, `/signin`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/orders`, `/orders/:orderId`, `/subscriptions`,
`/subscriptions/:subscriptionId`, `/favorites`, `/profile`, `/settings`,
`/notifications`.

1. `[P3-T1]` Build auth pages using `AuthShell` only (0.5): signup, signin,
   forgot/reset password, verify-email, OAuth entry/callback states.
   Add role-aware route guards, a deterministic fixture-backed "signed in
   user" concept, and forbidden/not-found pages.
2. `[P3-T2]` Build orders list + order detail using backend-shaped
   snapshots (dish/price/address snapshot fields, not live re-fetched
   data — per CONTEXT.md's order-snapshot behavior) and every order status.
3. `[P3-T3]` Build subscriptions (every subscription status and every
   pause/resume/skip/swap/cancel action state), favorites, profile,
   addresses, dietary preferences, and notification settings.
4. `[P3-T4]` Build notification center (bell, dropdown, full center, mark
   as read, category preferences, empty/offline states) using fixtures.
5. `[P3-T5]` Wire RTK Query against `services/mock` with the real future
   request shape (`credentials: 'include'`), and Zustand stores for cart,
   favorites, and fixture-backed auth/session state.

**Phase exit:** update `PublicShell`/nav to reveal signed-in-only links
(Orders, Subscriptions, Notifications, Profile) once a fixture user is
"signed in"; signed-out state still shows the Phase 2 experience plus
working Sign in/Sign up entry points. No forbidden wording in any new copy.

### Phase 4 — Chef Calm Kitchen

**Owns:** `/chef`, `/chef/onboarding`, `/chef/profile`, `/chef/dishes*`,
`/chef/plans*`, `/chef/schedule`, `/chef/orders*`, `/chef/reviews`,
`/chef/messages`, `/chef/analytics`, `/chef/earnings`, `/chef/payouts`,
`/chef/settings`.

1. `[P4-T1]` Build `ChefShell` (espresso dark theme per DESIGN.md §5),
   responsive nav, notifications entry, role-safe routing for the `CHEF` role.
2. `[P4-T2]` Build onboarding flow (Profile → Cuisine → Service area →
   Media → First dish → Schedule → Submit for approval), profile,
   verification/account states, portfolio media placeholders, public
   preview link back into the Phase 2 chef detail page.
3. `[P4-T3]` Build dish and meal-plan CRUD using every DRAFT/ACTIVE/
   INACTIVE/ARCHIVED (and plan equivalent) state, full metadata fields
   from CONTEXT.md.
4. `[P4-T4]` Build schedule/capacity, incoming order queue, order detail
   with status transitions, customer context, and a chat entry point.
5. `[P4-T5]` Build chef analytics (Recharts, date ranges) and earnings/
   payouts covering every ledger type (CREDIT/DEBIT/HOLD/HOLD_RELEASE)
   and every payout UI state from CONTEXT.md §5.

**Phase exit:** a fixture chef account can complete onboarding, manage
catalog/schedule, process an order end-to-end, and read calm dashboard/
earnings views — reachable via a real "become a chef" or role-switch path
wired from Phase 3's profile/settings, not a dead link.

### Phase 5 — Admin operations

**Owns:** `/admin*` per CONTEXT.md §6.

1. `[P5-T1]` Build neutral `AdminShell`, nav, breadcrumbs, global search,
   role-safe routing for `ADMIN`.
2. `[P5-T2]` Build operational overview, metrics, Recharts, activity feed,
   date filters.
3. `[P5-T3]` Build user/chef management, verification/moderation queues,
   detail views, status actions, confirmation dialogs.
4. `[P5-T4]` Build order, payout, coupon, review, notification, and DLQ
   operations with filters, pagination, detail drawers, error feedback.

**Phase exit:** an admin fixture account can moderate/inspect every listed
entity type with dense-table UI per DESIGN.md §5.1, reachable via a real
(even if simple/hardcoded-fixture) admin sign-in path.

### Phase 6 — Motion, media, and performance hardening

No new routes. Applies DESIGN.md §2–§5 consistently across everything
built in Phases 2–5.

1. `[P6-T1]` Build shared `SectionReveal`, `SplitHeadline`, `StatCounter`
   (DESIGN.md §6), landing ScrollTrigger lifecycle management, font/image
   load handling, trigger caps, cleanup on route unmount.
2. `[P6-T2]` Apply hero entrance, card parallax/hover, pinned sections,
   stat counters, final CTA across all marketing surfaces; transform/
   opacity only; reduced-motion fallback verified.
3. `[P6-T3]` Apply chart draw-ins and stat tick-ups to every dashboard
   built in Phases 3–5; confirm no scroll-triggered motion leaked into
   authenticated shells.
4. `[P6-T4]` Optimize chunking, images (aspect-ratio + object-fit per the
   card/image rules already agreed), fonts, selectors, caches, long lists,
   intent-based prefetching.

**Phase exit:** motion audit passes — marketing feels alive, dashboards
feel calm, reduced motion strips all transform/scrub everywhere.

### Phase 7 — Gateway integration seam and release validation

No new routes; swaps the data layer.

1. `[P7-T1]` Swap the mock base query for the real gateway through
   configuration, retaining a mock/demo *internal* mode for local dev.
2. `[P7-T2]` Map RTK Query endpoints to gateway REST/tRPC procedures
   (CONTEXT.md §3) without changing any page's props/contract.
3. `[P7-T3]` Add session revalidation, 401/403 handling, request-id/
   idempotency headers, normalized API errors, signed-media URL refresh.
4. `[P7-T4]` Run build/lint; validate every route, model parity against
   CONTEXT.md, responsive/keyboard behavior, reduced motion, and a final
   forbidden-wording sweep across the whole app.

**Phase exit:** integration is a configuration flag, mock mode still works
for local development, role routes fail safely, app is ready for contract
testing against the real gateway.

---

## 4. What changed from PLAN v1 (for context, not to re-litigate)

- Mock data is now hand-authored JSON fixtures only (no factories/faker),
  read through gateway-shaped service functions.
- Explicit ban on demo/mock/placeholder wording in any user-visible copy.
- Auth pages now specify `AuthShell` (split-screen, no nav/footer)
  instead of inheriting `PublicShell`.
- Phases now explicitly own a route list, must end fully wired with no
  dead links or "coming soon" stubs, and each task carries the shared
  acceptance checklist in §0.6 instead of a one-line exit criterion.