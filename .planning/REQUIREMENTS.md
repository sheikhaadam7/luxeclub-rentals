# Requirements: LuxeClub Rentals Web App

**Defined:** 2026-02-20
**Core Value:** Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password on the exclusive landing page
- [ ] **AUTH-02**: User receives phone OTP verification during signup
- [ ] **AUTH-03**: User can log in and session persists across browser refresh
- [ ] **AUTH-04**: Landing page requires login before browsing — dark luxury gate aesthetic
- [ ] **AUTH-05**: User can log out from any page

### Car Catalogue

- [ ] **CAT-01**: User can browse all available luxury vehicles with photos, specs, and pricing
- [ ] **CAT-02**: Each car displays daily, weekly, and monthly rental rates
- [ ] **CAT-03**: Each car shows real-time availability calendar
- [ ] **CAT-04**: Car inventory is auto-imported via scraper from luxeclubrentals.com
- [ ] **CAT-05**: Scraper includes monitoring, staleness alerts, and manual override capability

### Booking

- [ ] **BOOK-01**: User can select a vehicle and choose rental duration (daily/weekly/monthly)
- [ ] **BOOK-02**: User can pick start date and time for rental
- [ ] **BOOK-03**: Instant price calculation updates live as user changes duration/dates (Uber-style)
- [ ] **BOOK-04**: User can choose delivery (50 AED) or self-pickup (free)
- [ ] **BOOK-05**: User can pin drop or type delivery address with pinpoint accuracy on map
- [ ] **BOOK-06**: User can choose deposit (per-car amount) or no-deposit (+30% daily rate surcharge)
- [ ] **BOOK-07**: User receives booking confirmation via email and in-app
- [ ] **BOOK-08**: User can view upcoming and past bookings
- [ ] **BOOK-09**: User can choose return method: self-drop-off (free) or collection (50 AED)
- [ ] **BOOK-10**: Cancellation policy displayed clearly before payment

### Identity Verification

- [ ] **IDV-01**: User uploads passport scan during first booking
- [ ] **IDV-02**: User uploads driving license scan during first booking
- [ ] **IDV-03**: User takes face ID selfie that is auto-matched against document photo via KYC API (Onfido/Veriff)
- [ ] **IDV-04**: Automated liveness detection to prevent photo spoofing
- [ ] **IDV-05**: Verification status shown to user (pending/verified/rejected)
- [ ] **IDV-06**: User can browse and select cars before verification (verify only at booking)

### Payments

- [ ] **PAY-01**: User can pay with credit/debit card
- [ ] **PAY-02**: User can pay with Apple Pay
- [ ] **PAY-03**: User can pay with Google Pay
- [ ] **PAY-04**: User can pay with selected trusted cryptocurrencies
- [ ] **PAY-05**: User can pay cash on delivery (admin confirms collection)
- [ ] **PAY-06**: Deposit uses authorize → capture/void flow (not simple charge)
- [ ] **PAY-07**: No-deposit surcharge calculated and added to total automatically

### Real-Time Tracking

- [ ] **TRACK-01**: User sees live map tracking during car delivery showing real-time vehicle position
- [ ] **TRACK-02**: Booking status updates: Rental Confirmed → Car on the Move → Car Delivered
- [ ] **TRACK-03**: User can see car location on map throughout entire rental period
- [ ] **TRACK-04**: Map uses dark luxury theme matching brand aesthetic (Mapbox custom style)

### Admin Dashboard

- [ ] **ADMIN-01**: Admin can add, edit, and deactivate vehicles in the fleet
- [ ] **ADMIN-02**: Admin can set availability blocks and pricing per vehicle
- [ ] **ADMIN-03**: Admin can view and manage all bookings with status pipeline
- [ ] **ADMIN-04**: Admin can review and approve/reject identity verifications
- [ ] **ADMIN-05**: Admin can view payment status and confirm cash/bank payments
- [ ] **ADMIN-06**: Admin can view analytics overview (bookings, revenue, fleet utilization)

### Design & UX

- [ ] **UX-01**: Dark luxury theme: black background, cyan accents, Playfair Display + Inter/Poppins fonts
- [ ] **UX-02**: Fully mobile-responsive — complete booking flow works on iOS Safari and Android Chrome
- [ ] **UX-03**: Exclusive "secret service" aesthetic on landing/login page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments

- **PAY-V2-01**: User can pay via bank transfer (IBAN display, manual reconciliation)

### Communication

- **COMM-01**: WhatsApp notifications for booking confirmation and delivery ETA
- **COMM-02**: WhatsApp concierge chat widget for support

### Localization

- **LOC-01**: Arabic language support (RTL layout)

### Growth

- **GROW-01**: Referral / invitation system with discount codes
- **GROW-02**: Loyalty programme (points per AED, tier status)

### Advanced Features

- **ADV-01**: Chauffeur add-on option at booking
- **ADV-02**: Hourly / half-day rental periods
- **ADV-03**: Multi-car event package bookings
- **ADV-04**: Seasonal dynamic pricing in admin
- **ADV-05**: GPS tracker integration for fuel level monitoring
- **ADV-06**: Native iOS/Android app

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-language at launch | English only for v1 — Arabic in v2 after revenue validated |
| Native mobile app | PWA-first approach — native app deferred until traffic justifies investment |
| Automated dynamic/surge pricing | Luxury clients expect stable prices — manual seasonal pricing via admin instead |
| User-generated reviews | Hard to moderate; luxury brands curate social proof — use external Trustpilot/Google |
| Public fleet GPS tracking | Security risk — tracking only visible to booking customer during active rental |
| Price comparison / aggregator | Cannibalizes conversions; luxury brands don't price-compare |
| Subscription / membership with car swaps | High operational complexity; monthly rental pricing achieves similar benefit |
| Fully autonomous ID verification (no human fallback) | UAE RTA requires human accountability; automated OCR fails on ~15% of passports |
| Driver-facing mobile app | All cars from Downtown Dubai office for v1; driver app deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| BOOK-01 | Phase 3 | Pending |
| BOOK-02 | Phase 3 | Pending |
| BOOK-03 | Phase 3 | Pending |
| BOOK-04 | Phase 3 | Pending |
| BOOK-05 | Phase 3 | Pending |
| BOOK-06 | Phase 3 | Pending |
| BOOK-07 | Phase 3 | Pending |
| BOOK-08 | Phase 3 | Pending |
| BOOK-09 | Phase 3 | Pending |
| BOOK-10 | Phase 3 | Pending |
| IDV-01 | Phase 3 | Pending |
| IDV-02 | Phase 3 | Pending |
| IDV-03 | Phase 3 | Pending |
| IDV-04 | Phase 3 | Pending |
| IDV-05 | Phase 3 | Pending |
| IDV-06 | Phase 3 | Pending |
| PAY-01 | Phase 3 | Pending |
| PAY-02 | Phase 3 | Pending |
| PAY-03 | Phase 3 | Pending |
| PAY-04 | Phase 3 | Pending |
| PAY-05 | Phase 3 | Pending |
| PAY-06 | Phase 3 | Pending |
| PAY-07 | Phase 3 | Pending |
| TRACK-01 | Phase 4 | Pending |
| TRACK-02 | Phase 4 | Pending |
| TRACK-03 | Phase 4 | Pending |
| TRACK-04 | Phase 4 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 4 | Pending |
| ADMIN-05 | Phase 4 | Pending |
| ADMIN-06 | Phase 4 | Pending |
| UX-01 | Phase 1 | Pending |
| UX-02 | Phase 1 | Pending |
| UX-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation — traceability complete*
