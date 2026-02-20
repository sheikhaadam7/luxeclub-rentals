# LuxeClub Rentals Web App

## What This Is

A luxury car rental web app for LuxeClub Dubai that lets customers browse, book, and track luxury vehicle deliveries in an Uber-style experience. Primarily serves tourists (80%) and Dubai residents (20%) who want premium vehicles delivered to their location with real-time map tracking. Replaces the existing Framer-based brochure site (luxeclubrentals.com) with a fully transactional platform.

## Core Value

Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map — frictionless, premium, and exclusive.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Exclusive landing page with login/signup (secret-service aesthetic, dark luxury theme)
- [ ] Phone verification at signup (low friction entry)
- [ ] Browse car inventory without full verification (passport/license/face ID deferred to booking)
- [ ] Sleek car selection UI with vehicle details, images, and pricing
- [ ] Dynamic instant pricing based on vehicle, rental duration, and dates (Uber-style)
- [ ] Rental periods: daily, weekly, monthly with date/time picker
- [ ] Pin drop / address input for delivery location (pinpoint accuracy)
- [ ] Deposit options: pay deposit (per-car amount from website) OR no-deposit surcharge (daily rate * 0.3)
- [ ] Identity verification at booking: passport upload, driving license upload, face ID selfie match
- [ ] Age and identity compliance verification (face vs ID photo comparison)
- [ ] Payment: card, Apple Pay, Google Pay, bank transfer, cash on delivery, crypto (selected trusted coins)
- [ ] Delivery/collection fees: 50 AED for delivery, 50 AED for collection, free self-drop-off
- [ ] Booking status tracking: Rental Confirmed → Car on the Move → Car Delivered
- [ ] Live map tracking during car delivery showing real-time position
- [ ] Car location tracked on map throughout entire rental period
- [ ] Return options: customer self-drop-off (free) or collection from location (50 AED)
- [ ] Full admin dashboard: manage fleet, bookings, verifications, payments, analytics
- [ ] Scraper bot to extract car inventory, pricing, deposits, and images from luxeclubrentals.com
- [ ] Brand theme: dark/black background, minimalist luxury, matching luxeclubrentals.com aesthetic (cyan accents, Playfair Display + Inter/Poppins fonts)

### Out of Scope

- Multi-language support — English only for v1
- Separate driver/delivery app — all cars originate from Downtown Dubai office for v1
- Hourly rentals — daily minimum
- Real-time fuel level monitoring — future integration with existing car trackers
- In-app chat/support — defer to WhatsApp or phone for v1
- Mobile native app — web app first

## Context

- Existing business: LuxeClub operates in Dubai with a Framer website at luxeclubrentals.com
- Office location: Downtown Dubai (all cars delivered from here)
- Current site uses dark luxury aesthetic: black backgrounds, cyan (#09f) accents, Playfair Display + Inter + Poppins fonts
- Target audience: 80% tourists visiting Dubai, 20% local residents
- Dubai rental regulations require passport and driving license verification
- Future plan: integrate existing car GPS trackers for fuel levels and live location data
- Delivery/collection handled by company drivers from Downtown Dubai office

## Constraints

- **Brand**: Must match luxeclubrentals.com dark luxury aesthetic — customers should recognize the brand
- **Location**: Dubai-based, AED currency, UAE compliance for rental verification
- **Inventory source**: Car data scraped from existing Framer site (luxeclubrentals.com)
- **Delivery model**: All vehicles start from Downtown Dubai office — no multi-location support needed for v1
- **Verification**: Must include passport, driving license, and face ID verification before first booking

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Login-first landing page | Creates exclusive feel, aligns with luxury brand positioning | — Pending |
| Deferred verification (browse first, verify at booking) | Better UX — don't deter browsing with document uploads upfront | — Pending |
| No driver app for v1 | All cars from one location, simplifies v1 scope significantly | — Pending |
| Scrape existing site for inventory | Avoids manual data entry, keeps inventory in sync with current site | — Pending |
| 50 AED flat fee for delivery/collection | Simple pricing, customer self-drop-off is free | — Pending |

---
*Last updated: 2026-02-20 after initialization*
