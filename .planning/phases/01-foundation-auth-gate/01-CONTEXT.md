# Phase 1: Foundation + Auth Gate - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Login-first exclusive landing page with dark luxury aesthetic, account creation with email/password + phone OTP, session persistence, and an authenticated shell that protects all app routes. This is the foundation everything else is built on.

</domain>

<decisions>
## Implementation Decisions

### Landing page aesthetic
- "Secret service" exclusive feel — dark, minimal, mysterious
- Match luxeclubrentals.com: black background, cyan (#09f) accents
- Typography: Playfair Display for headings, Inter/Poppins for body
- Login and signup on the same page (toggle between them)

### Auth flow
- Email + password for account creation
- Phone OTP verification during signup (not deferred)
- Session persists across browser refresh
- Logout available from any page, returns to login gate
- No social login for v1 — email/password only

### Post-login shell
- All routes protected behind auth middleware
- User can browse car catalogue after login (verification deferred to booking)
- Mobile-responsive from day one (80% tourists on phones)

### Claude's Discretion
- Exact landing page animation/motion design
- Navigation layout (sidebar vs top nav vs minimal)
- Loading states and error message design
- Exact spacing, padding, component sizing
- Auth error UX (invalid password, OTP expiry, etc.)

</decisions>

<specifics>
## Specific Ideas

- User described it as an "exclusive secret service type website" — the landing page should feel like entering a private club
- Existing site (luxeclubrentals.com) uses dark theme with radial gradients from dark gray to pure black, subtle borders at 15% opacity
- The login gate IS the brand statement — it's the first thing every customer sees

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth-gate*
*Context gathered: 2026-02-20*
