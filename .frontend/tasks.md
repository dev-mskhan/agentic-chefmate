# ChefMate Frontend Task Tracker

Update `status` only after the task's full scope and phase exit criteria are
complete. Every task also uses the acceptance checklist in PLAN.md section 0.6.

Status values: `pending`, `in_progress`, `done`, `blocked`

## Phase 1 - Foundation and design system

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P1-T1 | Replace the Vite starter with the required app structure, entry, providers, router, error boundary, and responsive baseline | done | - |
| P1-T2 | Configure Tailwind and Warm Hearth tokens, typography, focus states, and reduced motion | done | P1-T1 |
| P1-T3 | Build accessible atoms and their loading, error, and disabled states | done | P1-T2 |
| P1-T4 | Build PublicShell, AuthShell, shared organisms, and page primitives | done | P1-T3 |

## Phase 2 - Auth-free public product experience

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P2-T1 | Author exact backend-shaped JSON fixtures plus mock and API service seams for chefs, dishes, meal plans, and reviews | done | P1-T4 |
| P2-T2 | Build the landing page with COPY.md-safe product copy, intact Warm Hearth design, and only real destinations | done | P2-T1 |
| P2-T3 | Build public discovery for chefs, dishes, and meal plans with URL filters, pagination, and all result states | done | P2-T2 |
| P2-T4 | Build public detail pages with reviews, media, availability, related content, and optimistic favorites | done | P2-T3 |
| P2-T5 | Build one-chef cart and checkout preview with address, coupons, pricing, payment placeholder, idempotency, and confirmation | done | P2-T4 |

## Phase 3 - Customer identity and user-service experience

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P3-T1 | Build auth pages with AuthShell, fixture-backed identity, guards, forbidden, and not-found pages | done | P2-T5 |
| P3-T2 | Build orders and order timelines with backend-shaped snapshots and every order status | done | P3-T1 |
| P3-T3 | Build subscriptions, favorites, profile, addresses, dietary preferences, and settings | done | P3-T2 |
| P3-T4 | Build notification center, read states, category preferences, empty, and offline states | done | P3-T3 |
| P3-T5 | Wire RTK Query to services/mock and Zustand stores for cart, favorites, and auth/session state | done | P3-T4 |

## Phase 4 - Chef Calm Kitchen

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P4-T1 | Build ChefShell, responsive navigation, notifications, and CHEF-safe routing | done | P3-T1 |
| P4-T2 | Build chef onboarding, profile, verification, service area, portfolio, and public preview | done | P4-T1 |
| P4-T3 | Build dish and meal-plan CRUD with canonical fields, metadata, and statuses | done | P4-T2 |
| P4-T4 | Build schedule, capacity, incoming orders, order transitions, customer context, and chat entry | done | P4-T3 |
| P4-T5 | Build chef analytics, earnings, and payouts for all ledger and payout states | done | P4-T4 |

## Phase 5 - Admin operations

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P5-T1 | Build AdminShell, navigation, breadcrumbs, search, and ADMIN-safe routing | done | P3-T1 |
| P5-T2 | Build admin overview, metrics, activity, health placeholders, and date filters | done | P5-T1 |
| P5-T3 | Build user and chef management, verification, moderation, detail views, and status actions | done | P5-T2 |
| P5-T4 | Build order, payout, coupon, review, notification, and DLQ operations | done | P5-T3 |

## Phase 6 - Motion, media, and performance hardening

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P6-T1 | Build shared motion primitives and landing ScrollTrigger lifecycle | pending | P2-T2 |
| P6-T2 | Apply marketing choreography, parallax, pinned sections, stats, and reduced-motion fallbacks | pending | P6-T1 |
| P6-T3 | Apply restrained chart draw-ins and stat tick-ups to dashboard surfaces | pending | P4-T5, P5-T2 |
| P6-T4 | Optimize chunks, images, fonts, selectors, caches, long lists, and prefetching | pending | P6-T2, P6-T3 |

## Phase 7 - Gateway integration and release validation

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P7-T1 | Swap mock data for the configured gateway while retaining internal local mock mode | pending | P3-T5 |
| P7-T2 | Map service functions and RTK Query contracts to gateway REST/tRPC procedures | pending | P7-T1 |
| P7-T3 | Add session revalidation, auth errors, request metadata, normalized errors, and signed media refresh | pending | P7-T2 |
| P7-T4 | Run build, lint, route, model parity, responsive, keyboard, reduced-motion, and COPY.md validation | pending | P7-T3 |

## Current execution

- Current phase: Phase 5 - Admin Operations complete, ready for Phase 6 (Motion, media, and performance hardening)
- Active task: none
- Completed tasks: `P1-T1`, `P1-T2`, `P1-T3`, `P1-T4`, `P2-T1`, `P2-T2`,
  `P2-T3`, `P2-T4`, `P2-T5`, `P3-T1`, `P3-T2`, `P3-T3`, `P3-T4`, `P3-T5`,
  `P4-T1`, `P4-T2`, `P4-T3`, `P4-T4`, `P4-T5`, `P5-T1`, `P5-T2`, `P5-T3`, `P5-T4`
- Phase 5 complete: Admin Operations Console is live with dedicated login (`/admin/login`), role-guarded `AdminShell`, real-time platform metrics & Recharts GMV trajectory, pending chef verification queues, user suspension management, global order inspection & refunds, 1-Link bank disbursements, review moderation, automated quality flags, immutable security audit trails, and system maintenance controls.
