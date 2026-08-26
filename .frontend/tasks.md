# ChefMate Frontend Task Tracker

Update `status` only after the task's full scope and phase exit criteria are
complete. Keep this file synchronized with the numbered tasks in
`.frontend/PLAN.md`.

Status values: `pending`, `in_progress`, `done`, `blocked`

## Phase 1 — Foundation and design system

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P1-T1 | Replace Vite starter with app entry, requested folders, providers, router, error boundary, and responsive baseline | done | — |
| P1-T2 | Configure Tailwind and Warm Hearth tokens, typography, focus, and reduced-motion defaults | done | P1-T1 |
| P1-T3 | Build accessible atomic components and their loading/error/disabled states | done | P1-T2 |
| P1-T4 | Build shared molecules, organisms, and role shell templates | done | P1-T3 |

## Phase 2 — Contracts, mocks, and navigation

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P2-T1 | Define backend-compatible domain types, enums, status mapping, formatting, and validation | done | P1-T1 |
| P2-T2 | Create deterministic mock repositories and fixtures for all backend domains | done | P2-T1 |
| P2-T3 | Add RTK Query mock/gateway seams and Zustand client-only stores | done | P2-T2 |
| P2-T4 | Add lazy public/protected role routing, guards, forbidden, and not-found pages | done | P2-T3 |

## Phase 3 — Customer-first experience

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P3-T1 | Build Warm Hearth landing page and responsive discovery entry | done | P1-T4, P2-T4 |
| P3-T2 | Build chef, dish, and meal-plan discovery with complete URL filter state | pending | P3-T1 |
| P3-T3 | Build chef, dish, and meal-plan detail, reviews, media, availability, and favorites | pending | P3-T2 |
| P3-T4 | Build one-chef cart and mocked checkout flow | pending | P3-T3 |
| P3-T5 | Build customer dashboard, orders, subscriptions, payments, profile, notifications, and chat | pending | P3-T4 |

## Phase 4 — Chef Calm Kitchen

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P4-T1 | Build espresso chef shell and role-safe navigation | pending | P2-T4 |
| P4-T2 | Build chef onboarding, profile, verification, service area, portfolio, and public preview | pending | P4-T1 |
| P4-T3 | Build dish and meal-plan management with canonical fields and statuses | pending | P4-T2 |
| P4-T4 | Build schedule, availability, orders, customer context, and chat | pending | P4-T3 |
| P4-T5 | Build chef dashboards, earnings including holds/releases, payouts, and notifications | pending | P4-T4 |

## Phase 5 — Admin operations

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P5-T1 | Build neutral admin shell and role-safe navigation | pending | P2-T4 |
| P5-T2 | Build admin operational overview, metrics, activity, and health placeholders | pending | P5-T1 |
| P5-T3 | Build user/chef management and verification/moderation queues | pending | P5-T2 |
| P5-T4 | Build order, payout, coupon, review, notification, and DLQ operations | pending | P5-T3 |

## Phase 6 — Motion, media, and performance hardening

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P6-T1 | Add shared GSAP primitives and landing ScrollTrigger lifecycle | pending | P3-T1 |
| P6-T2 | Add landing choreography, parallax, pinned sections, stats, and fallbacks | pending | P6-T1 |
| P6-T3 | Add restrained dashboard chart draw-ins and stat tick-ups | pending | P4-T5, P5-T2 |
| P6-T4 | Optimize route chunks, media, fonts, selectors, caches, and long lists | pending | P6-T2, P6-T3 |

## Phase 7 — Gateway integration and release validation

| ID | Task | Status | Depends on |
| --- | --- | --- | --- |
| P7-T1 | Add configuration-driven gateway base query while retaining demo mode | pending | P2-T3 |
| P7-T2 | Map RTK Query contracts to gateway REST/tRPC procedures | pending | P7-T1 |
| P7-T3 | Add session revalidation, auth errors, request metadata, normalized errors, and signed media lifecycle | pending | P7-T2 |
| P7-T4 | Complete build/lint, route, parity, responsive, accessibility, reduced-motion, and Impeccable validation | pending | P7-T3 |

## Current execution

- Current phase: Phase 2 — Contracts, mocks, and navigation
- Active tasks: none
- Completed tasks: `P1-T1`, `P1-T2`, `P1-T3`, `P1-T4`, `P2-T1`, `P2-T2`, `P2-T3`, `P2-T4`, `P3-T1`
- Next tasks: build chef, dish, and meal-plan discovery with complete URL filter state.
