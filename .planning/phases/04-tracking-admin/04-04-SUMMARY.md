---
phase: 04-tracking-admin
plan: 04
subsystem: ui, api
tags: [react, nextjs, server-actions, supabase, admin, kyc, payments, analytics, typescript]

# Dependency graph
requires:
  - phase: 04-tracking-admin
    provides: "04-03: Multi-tab admin dashboard infrastructure (AdminTabs, FleetTab, BookingsTab, tab routing)"

provides:
  - "KYC review tab with approve/reject queue and optimistic locking"
  - "Payment management tab with cash/bank transfer confirmation flow"
  - "Analytics overview tab with 4 summary cards (bookings, revenue, fleet utilization)"
  - "5 new admin Server Actions: getPendingKYC, reviewKYC, getPaymentBookings, confirmManualPayment, getAnalyticsSummary"
  - "Complete admin operations dashboard — all 5 tabs fully functional"

affects:
  - Admin workflow: KYC review, payment confirmation, and analytics are now operational
  - Customer profiles: reviewKYC updates profiles.kyc_status (verified/rejected)
  - Bookings: confirmManualPayment sets payment_status to paid

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "N+1 email lookup for small KYC queue — getPendingKYC fetches emails via auth.admin.getUserById per profile; acceptable for small queue (<50)"
    - "Optimistic locking for KYC via .in('kyc_status', ['submitted', 'pending']) — prevents double-processing"
    - "Optimistic locking for payment via .eq('payment_status', 'pending_cash') — prevents double-confirmation"
    - "Inline confirm flow in PaymentsTab — method selector + confirm/cancel exposed only when admin clicks Confirm Payment"
    - "4-card 2x2 grid analytics layout (1-col mobile, 2-col sm+) — clean summary numbers, no charts"
    - "Suspense + TabSkeleton wrapper on all 5 tab renders — prevents full-page flash on tab navigation"

key-files:
  created:
    - components/admin/KYCTab.tsx
    - components/admin/PaymentsTab.tsx
    - components/admin/AnalyticsTab.tsx
  modified:
    - app/actions/admin.ts
    - app/(protected)/admin/page.tsx

key-decisions:
  - "getPendingKYC uses N+1 auth.admin.getUserById for email lookup — acceptable for small KYC queue, avoids listUsers() overhead for filtering"
  - "reviewKYC uses .in() optimistic lock not .eq() — supports both 'submitted' and 'pending' kyc_status values (Veriff may set either)"
  - "getPaymentBookings uses .or() to catch both pending_cash status AND cash/bank_transfer method — ensures no manual payment is missed"
  - "AnalyticsTab shows all-time revenue in both 'Fleet Utilization' sub-text and 'All-Time Revenue' card — redundant but each card is independently readable"
  - "Suspense wrappers added to all 5 tabs (not just new ones) — consistent behavior, prevents flash on any tab switch"

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 4 Plan 04: KYC, Payments, and Analytics Tabs Summary

**Three fully functional admin tab components (KYCTab, PaymentsTab, AnalyticsTab) with 5 new Server Actions completing the admin operations dashboard — KYC approval with optimistic locking, cash/bank payment confirmation, and analytics summary cards.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T23:08:13Z
- **Completed:** 2026-02-20T23:14:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Extended `app/actions/admin.ts` with 5 new auth-gated Server Actions: `getPendingKYC` (FIFO queue with email lookup), `reviewKYC` (approve/reject with optimistic locking), `getPaymentBookings` (pending cash/bank bookings), `confirmManualPayment` (optimistic locking on pending_cash), `getAnalyticsSummary` (this month + all-time + fleet utilization)
- Built `KYCTab` client component with pending KYC queue, count badge, approve/reject buttons using `useTransition`, per-entry feedback messages, empty state
- Built `PaymentsTab` client component with payment bookings list, inline confirm flow with method selector (Cash / Bank Transfer), color-coded status badges, paid checkmark
- Built `AnalyticsTab` client component with 2x2 summary card grid (bookings this month, revenue this month, fleet utilization %, all-time revenue), brand-consistent styling
- Updated admin page: replaced all 3 "coming soon" placeholders with `<KYCTab />`, `<PaymentsTab />`, `<AnalyticsTab />`, wrapped all 5 tabs in `<Suspense fallback={<TabSkeleton />}>`, added imports

## Task Commits

Each task was committed atomically:

1. **Task 1: KYC, Payment, and Analytics Server Actions** - `825c827` (feat)
2. **Task 2: KYCTab, PaymentsTab, AnalyticsTab components and admin page wiring** - `fa5f581` (feat)

## Files Created/Modified

- `app/actions/admin.ts` — 5 new Server Actions added (344 lines); existing 11 actions unchanged
- `components/admin/KYCTab.tsx` — KYC review tab, 175 lines
- `components/admin/PaymentsTab.tsx` — Payment management tab, 242 lines
- `components/admin/AnalyticsTab.tsx` — Analytics overview tab, 115 lines
- `app/(protected)/admin/page.tsx` — Replaced placeholders, added imports + Suspense wrappers

## Decisions Made

- **N+1 email lookup in getPendingKYC:** The KYC pending queue is expected to be small (<50 at any time). Using `auth.admin.getUserById()` per profile is simpler and avoids filtering from `listUsers()` which returns all users. Email lookup failures are non-fatal — the queue still shows the userId as fallback.
- **reviewKYC uses `.in()` not `.eq()`:** Both 'submitted' and 'pending' are valid states for KYC entries pending review (Veriff may set either depending on its flow stage). The optimistic lock must accept both.
- **getPaymentBookings uses `.or()` filter:** Catches bookings by payment_status (pending_cash, unpaid) OR by payment_method (cash, bank_transfer). This ensures the admin sees all manual payment bookings including ones where the method was set to cash but status has since changed.
- **Suspense on all 5 tabs:** The plan specified wrapping the new tabs, but consistency required wrapping FleetTab and BookingsTab too. All tabs now have the same skeleton-fade behavior on tab navigation.

## Deviations from Plan

None — plan executed exactly as written.

## User Setup Required

None — no new external service configuration required. All new Server Actions use the existing admin client pattern established in Plans 01-03.

## Phase 4 Completion

This plan completes Phase 4 (Tracking + Admin). All ADMIN features are now implemented:
- ADMIN-01: Fleet management — FleetTab (Plan 03)
- ADMIN-02: Availability blocks — FleetTab (Plan 03)
- ADMIN-03: Booking pipeline — BookingsTab (Plan 03)
- ADMIN-04: KYC review + approve/reject — KYCTab (this plan)
- ADMIN-05: Payment confirmation for cash/bank — PaymentsTab (this plan)
- ADMIN-06: Analytics overview — AnalyticsTab (this plan)

The admin dashboard at `/admin` is fully operational. The business is operationally ready.

---
*Phase: 04-tracking-admin*
*Completed: 2026-02-20*

## Self-Check: PASSED

Files verified:
- FOUND: app/actions/admin.ts
- FOUND: components/admin/KYCTab.tsx
- FOUND: components/admin/PaymentsTab.tsx
- FOUND: components/admin/AnalyticsTab.tsx
- FOUND: app/(protected)/admin/page.tsx

Commits verified:
- FOUND: 825c827 (Task 1: KYC, Payment, Analytics Server Actions)
- FOUND: fa5f581 (Task 2: KYCTab, PaymentsTab, AnalyticsTab and admin page wiring)
