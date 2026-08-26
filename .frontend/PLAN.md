# ChefMate Frontend Implementation Plan

## Scope

Build a dummy, fully navigable frontend for **customer, chef, and admin**
experiences, with the customer purchase journey first. Backend integration is
deferred, but every mock contract must preserve backend field names,
relationships, enum values, pagination concepts, loading states, and errors.

Primary references:

- `.frontend/CONTEXT.md` — product, domain, routes, models, and API behavior
- `.frontend/DESIGN.md` — Warm Hearth visual system and motion rules
- `.frontend/tasks.md` — phase task tracker; update each task to `done` only
  after its acceptance criteria are met

## Architecture

```text
apps/web/src/
├── components/
│   ├── atoms/          # Button, Badge, Input, Icon, Spinner, Avatar, etc.
│   ├── molecules/      # SearchBar, FilterGroup, StatCard, DishCard, etc.
│   ├── organisms/      # Navs, grids, tables, checkout, dashboards
│   └── templates/      # Marketing, customer, chef, and admin shells
├── pages/              # Lazy route entries by product surface
├── hooks/              # Auth, media, motion, pagination, responsive helpers
├── lib/                # Router, stores, RTK Query, GSAP setup
├── services/           # Mock repositories first; gateway adapters later
├── styles/             # Tailwind entry, tokens, base layers
├── types/              # Backend-compatible domain/API contracts
└── utils/              # Formatting, statuses, validation, constants
```

## Technology and quality constraints

- Vite, React, TypeScript, Tailwind CSS, ReactBits-compatible primitives,
  GSAP 3 + ScrollTrigger, Redux Toolkit Query, Zustand where client-only
  state is appropriate, and Recharts.
- Performance is the first priority: route-level code splitting, lazy media,
  explicit image dimensions, font-conscious loading, stable selectors,
  memoized lists, bounded caches, and no unnecessary animation work.
- Use `Suspense` fallbacks, error boundaries, semantic HTML, visible focus,
  keyboard navigation, responsive layouts, and reduced-motion support.
- GSAP is the only animation engine. Marketing can use editorial choreography;
  authenticated shells use only chart draw-ins, short stat tick-ups, and
  150ms-or-less CSS transitions.
- The browser talks to the gateway only (`http://localhost:3000` later) with
  cookie credentials; service URLs never appear in page components.

## Backend-compatible model coverage

Create typed fixtures and service seams for:

- Auth identity, roles (`USER`, `CHEF`, `ADMIN`), verification, signin/signup,
  refresh, signout, password reset, and OAuth entry points.
- User profiles, addresses, dietary preferences, allergies, favorites, and
  notification preferences.
- Chef profiles, verification/account states, specialties, service area,
  portfolio/media, ratings, and discoverability eligibility.
- Dishes: chef linkage, title, description, price, ingredients, dietary tags,
  allergens, media, availability, category, and status.
- Meal plans: one-off/subscription type, `WEEKLY`, `BIWEEKLY`, `MONTHLY`
  frequencies, tiers, rules, pricing, media, and ratings.
- Discovery filters: geo, cuisine, dietary, allergen, price, rating,
  category, occasion, and availability.
- Cart/checkout: one-chef constraint, delivery date, saved address, coupon
  validation, pricing preview, payment client-secret placeholder, idempotency.
- Orders, snapshots, pricing, delivery address, subscription linkage,
  cancellation metadata, and statuses:
  `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`,
  `DELIVERED`, `CANCELLED`.
- Subscriptions and pause/resume/skip/swap/cancel actions with statuses:
  `PENDING`, `ACTIVE`, `PAUSED`, `CANCELLED`, `PAST_DUE`, `COMPLETED`.
- Payments, reviews, chat threads/messages/unread counts, notifications,
  signed media upload/download lifecycle, dashboards, payouts, coupons, and
  admin moderation/DLQ data.
- Chef earnings ledger types: `CREDIT`, `DEBIT`, `HOLD`, `HOLD_RELEASE`.

## Phases and small patches

Each numbered patch below maps to the corresponding task ID in
`.frontend/tasks.md`. Work proceeds in task order unless a dependency is
explicitly noted. The task tracker is the execution record; this document is
the intended architecture and acceptance criteria.

### Phase 1 — Foundation and design system

1. `[P1-T1]` Replace the Vite starter with the requested folders, application entry,
   router/provider composition, error boundary, and responsive baseline.
2. `[P1-T2]` Configure Tailwind and Warm Hearth tokens: cream, charcoal, terracotta,
   saffron, sage, rust, clay, espresso, Fraunces, Inter/General Sans,
   spacing, radii, shadows, status colors, focus, and reduced motion.
3. `[P1-T3]` Build atoms: Button, Link, Icon, Input, Select, Textarea, Checkbox, Badge,
   Avatar, Spinner, Skeleton, EmptyState, Modal, Toast, and Image.
4. `[P1-T4]` Build shared molecules/organisms/templates: StickyNav, sidebar/topbar,
   breadcrumbs, search/filter controls, pagination, data table, stat card,
   date range, containers, and role shells.

**Exit criteria:** no starter UI; clean build; keyboard-usable responsive
shells; typed lazy routes with Suspense fallbacks.

### Phase 2 — Contracts, mocks, and navigation

1. `[P2-T1]` Add domain types, enum constants, status mapping, formatting, and
   validation utilities from backend models.
2. `[P2-T2]` Add deterministic mock repositories/fixtures for every domain, including
   loading, empty, pagination, and recoverable error states.
3. `[P2-T3]` Add RTK Query with a mock base query and a gateway base-query seam using
   `credentials: include`; add Zustand for cart and transient UI state.
4. `[P2-T4]` Add public/protected role-aware routing, guards, forbidden/not-found pages,
   and route-level lazy imports.

**Exit criteria:** every route opens in mock mode; roles are deterministic;
components do not import fixture modules or service URLs directly.

### Phase 3 — Customer-first experience

1. `[P3-T1]` Build Warm Hearth landing: hero/photo stack, sticky nav, how-it-works reel,
   dish/chef preview, stats, chef spotlight, testimonial, and final CTA.
2. `[P3-T2]` Build chef, dish, and meal-plan discovery with URL filters for geo, cuisine,
   dietary, allergen, price, rating, category, occasion, availability,
   pagination, and empty states.
3. `[P3-T3]` Build chef/dish/meal-plan detail, reviews, media gallery, availability,
   and favorites.
4. `[P3-T4]` Build one-chef cart, delivery date/address, coupon validation, pricing
   preview, checkout review, payment placeholder, idempotency, confirmation.
5. `[P3-T5]` Build customer shell pages: overview, orders/timeline, subscriptions and
   pause/resume/skip/swap/cancel, payments, favorites, profile/addresses/
   preferences, notifications, and chat.

**Exit criteria:** a visitor can discover, inspect, cart, mock-checkout, and
track an order/subscription using backend-shaped data.

### Phase 4 — Chef Calm Kitchen

1. `[P4-T1]` Build espresso chef shell, responsive navigation, notifications, and
   role-safe routes.
2. `[P4-T2]` Build onboarding/profile, verification/account states, specialties,
   service area, portfolio/media placeholders, and public preview.
3. `[P4-T3]` Build dish and meal-plan CRUD screens with ingredients, dietary/allergen
   metadata, media, availability, canonical frequency/status values.
4. `[P4-T4]` Build schedules, incoming orders, order detail/status transitions, customer
   context, and chat.
5. `[P4-T5]` Build Recharts overview, date ranges, order metrics, earnings including
   held/released values, payouts, notifications, and all state variants.

**Exit criteria:** a chef can manage catalog/schedule, handle order lifecycle,
message customers, and read calm dashboard/earnings surfaces.

### Phase 5 — Admin operations

1. `[P5-T1]` Build neutral admin shell, navigation, breadcrumbs, global search, and
   role-safe routes.
2. `[P5-T2]` Build operational overview, metrics, Recharts, activity, health
   placeholders, and date filters.
3. `[P5-T3]` Build user/chef management, verification/moderation queues, detail views,
   status actions, and audit-friendly confirmations.
4. `[P5-T4]` Build order, payout, coupon, review, notification, and DLQ operations with
   filters, pagination, detail drawers, and error feedback.

**Exit criteria:** an admin can inspect/moderate entities, manage coupons,
review payouts/orders, and handle notification/DLQ states.

### Phase 6 — Motion, media, and performance hardening

1. `[P6-T1]` Add shared GSAP `SectionReveal`, `SplitHeadline`, `StatCounter`, landing
   ScrollTrigger lifecycle, font/image refresh, trigger caps, and cleanup.
2. `[P6-T2]` Add landing hero entrance, card parallax/hover, pinned sections, stats, and
   final CTA; use transform/opacity only and mobile/reduced-motion fallbacks.
3. `[P6-T3]` Add only dashboard chart draw-ins and short stat tick-ups.
4. `[P6-T4]` Optimize chunks, images, fonts, selectors, caches, long lists, and
   intent-based prefetching.

**Exit criteria:** marketing motion is isolated, reduced motion removes
transforms/scrub, and initial route payloads remain focused.

### Phase 7 — Gateway integration seam and release validation

1. `[P7-T1]` Swap mock base query through configuration while retaining demo mode.
2. `[P7-T2]` Map RTK Query endpoints to gateway REST/tRPC procedures without changing
   page contracts.
3. `[P7-T3]` Add session revalidation, 401/403 handling, request-id/idempotency,
   normalized API errors, and signed-media lifecycle handling.
4. `[P7-T4]` Run existing build/lint checks; validate routes, model parity, responsive
   and keyboard behavior, reduced motion, and the Impeccable detector.

**Exit criteria:** integration is configuration-driven, mock mode still works,
role routes fail safely, and the frontend is ready for contract testing.

## Deferred integration boundaries

The dummy phase does not capture payments, upload files, exchange OAuth,
deliver push notifications, or connect websocket chat. Those flows use typed
placeholders and simulated state while preserving real gateway boundaries.
