# Roadmap: LuxeClub Rentals Web App

## Overview

LuxeClub Dubai delivers a login-gated luxury car rental platform where customers browse, book, and track vehicle deliveries in real time. The roadmap runs four phases: establish the authenticated foundation with brand identity, populate and manage the car inventory, complete the full transactional booking loop with identity and payment, then wire up live tracking and the admin operations layer that lets the business run.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Auth Gate** — Login-first gate, dark luxury shell, database schema, and authenticated session
- [ ] **Phase 2: Inventory + Catalogue** — Scraped and admin-managed car inventory browseable behind the auth gate
- [ ] **Phase 3: Booking, Identity, and Payment** — Complete transactional loop from car selection through ID verification to payment confirmation
- [ ] **Phase 4: Tracking + Admin** — Live delivery map, real-time booking status, and full admin operations dashboard

## Phase Details

### Phase 1: Foundation + Auth Gate

**Goal:** Users arrive at a dark luxury landing page, create an account with phone OTP, and their authenticated session persists — the exclusive gate is in place before any other surface is built.

**Depends on:** Nothing (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, UX-01, UX-02, UX-03

**Success Criteria** (what must be TRUE):
  1. User lands on a dark luxury page with Playfair Display typography, black background, and cyan accents — no app content is visible without signing in
  2. User can create an account with email, password, and phone OTP verification, then log in and remain authenticated across browser refresh
  3. User can log out from any page and is returned to the login gate
  4. The full signup and login flow works end-to-end on iOS Safari and Android Chrome

**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js 16, wire Supabase clients, implement auth Server Actions and profiles schema
- [ ] 01-02-PLAN.md — Middleware route protection, protected layout, auth form components (LoginForm, SignupForm, OTPForm, AuthGate)
- [ ] 01-03-PLAN.md — Dark luxury design tokens, login-gate landing page, dashboard shell, end-to-end verification

---

### Phase 2: Inventory + Catalogue

**Goal:** Logged-in users can browse all luxury vehicles with photos, specs, and pricing, sourced from the scraper and manageable by admin — availability is accurate in real time.

**Depends on:** Phase 1

**Requirements:** CAT-01, CAT-02, CAT-03, CAT-04, CAT-05

**Success Criteria** (what must be TRUE):
  1. User can browse all vehicles with high-resolution photos, specs, and daily/weekly/monthly rates displayed on the catalogue page
  2. Each car shows a real-time availability calendar that blocks dates already booked
  3. Car inventory is auto-populated from the Playwright scraper running against luxeclubrentals.com
  4. Admin sees a staleness alert if scraper results drop or data is stale, and can manually override any vehicle record

**Plans:** TBD

Plans:
- [ ] 02-01: Playwright scraper with monitoring, staleness alerts, and DB import
- [ ] 02-02: Car catalogue UI — vehicle cards, detail pages, availability calendar

---

### Phase 3: Booking, Identity, and Payment

**Goal:** Users can select a car, configure a rental with live pricing, verify their identity, and complete payment — the business can take its first real booking.

**Depends on:** Phase 2

**Requirements:** BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08, BOOK-09, BOOK-10, IDV-01, IDV-02, IDV-03, IDV-04, IDV-05, IDV-06, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07

**Success Criteria** (what must be TRUE):
  1. User can select a vehicle, pick dates and duration (daily/weekly/monthly), choose delivery or self-pickup with a pin-drop address, and see a live price update as they configure — including the 50 AED delivery fee and the deposit vs no-deposit toggle
  2. User is prompted to upload passport, driving license, and face ID selfie on first booking; verification status (pending/verified/rejected) is visible in their account
  3. User can pay with card, Apple Pay, Google Pay, cryptocurrency, or cash on delivery — deposit is pre-authorized (not charged) and the no-deposit surcharge is calculated and applied automatically
  4. User receives booking confirmation in-app and by email, can view upcoming and past bookings, and sees cancellation policy before paying
  5. User can choose self-drop-off (free) or collection (50 AED) as their return method during booking

**Plans:** TBD

Plans:
- [ ] 03-01: Multi-step booking wizard — car, dates, delivery/pickup, pricing, return method
- [ ] 03-02: Identity verification flow — document upload, face ID, KYC API integration, status display
- [ ] 03-03: Payment integration — Stripe (card/Apple Pay/Google Pay), crypto (NOWPayments), COD/bank transfer, deposit authorize/capture/void

---

### Phase 4: Tracking + Admin

**Goal:** Customers can watch their car arrive on a live map; admins can manage the entire fleet, all bookings, all identity verifications, and all payments from one dashboard — the business is operationally ready.

**Depends on:** Phase 3

**Requirements:** TRACK-01, TRACK-02, TRACK-03, TRACK-04, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06

**Success Criteria** (what must be TRUE):
  1. Customer sees a live Mapbox map during active car delivery showing real-time vehicle position updating as it moves toward them
  2. Booking status transitions (Rental Confirmed → Car on the Move → Car Delivered) are visible to the customer in real time without a page refresh
  3. Customer can view car location on the map throughout the full rental period
  4. Admin can add, edit, and deactivate vehicles; set pricing and availability blocks; and view analytics (bookings, revenue, fleet utilization)
  5. Admin can review and approve or reject identity verifications, confirm cash and bank transfer payments, and manage the full booking status pipeline

**Plans:** TBD

Plans:
- [ ] 04-01: Supabase Realtime tracking layer — GPS ingestion, tracking_log, useDriverLocation and useRealtimeBooking hooks
- [ ] 04-02: Customer-facing live map and booking status timeline (Mapbox dark style)
- [ ] 04-03: Admin dashboard — fleet, bookings, ID verification queue, payments, analytics

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth Gate | 0/3 | Not started | - |
| 2. Inventory + Catalogue | 0/2 | Not started | - |
| 3. Booking, Identity, and Payment | 0/3 | Not started | - |
| 4. Tracking + Admin | 0/3 | Not started | - |

---

*Roadmap created: 2026-02-20*
*Last updated: 2026-02-20 after Phase 1 planning*
