-- Store what the customer actually chose, and the amounts they were charged
-- for it.
--
-- Until now the booking row recorded none of this. The server priced every
-- booking WITHOUT the protection package, the add-ons or the delivery zone,
-- so total_due was short by up to AED 450/day, and nothing in the business
-- knew a personal driver or a child seat had been ordered.
--
-- The amount columns exist so the invoice reconciles. The customer-facing
-- breakdowns list the parts and print total_due as their sum; without
-- protection_surcharge, addons_total and card_surcharge those pages would
-- show hundreds of dirhams unaccounted for.
--
-- card_surcharge in particular has NEVER been stored, even though the 3% is
-- folded into total_due. That gap exists today and this change would widen
-- it, because the 3% now applies to a larger base.
--
-- Idempotent: safe to re-run.

alter table public.bookings
  -- 'basic' | 'inclusive'. No CHECK constraint on purpose: createBooking
  -- coerces the value with the same test the pricing calculator uses, so the
  -- row can never disagree with the price, and a malformed client payload
  -- can never fail the insert.
  add column if not exists protection_package text,

  -- The four add-on booleans, written narrowed rather than as the raw client
  -- object: { additionalDriver, personalDriver, babySeat, childSeat }.
  add column if not exists addons jsonb not null default '{}'::jsonb,

  -- Zone key from DELIVERY_ZONE_FEES (within_dubai, al_maktoum_airport, …).
  -- The human-readable address goes in the existing delivery_address column.
  add column if not exists delivery_location text,

  -- Amounts, so the breakdown pages can show a line rather than re-deriving
  -- it from day counts. numeric(10,2) matches every other money column here.
  add column if not exists protection_surcharge numeric(10,2) not null default 0,
  add column if not exists addons_total numeric(10,2) not null default 0,
  add column if not exists card_surcharge numeric(10,2) not null default 0;

comment on column public.bookings.protection_package is
  'Protection package chosen: basic | inclusive. Coerced server-side.';
comment on column public.bookings.addons is
  'Opt-in add-ons as four booleans. Priced server-side from ADDON_PRICES.';
comment on column public.bookings.delivery_location is
  'Delivery zone key. The address itself is in delivery_address.';
comment on column public.bookings.protection_surcharge is
  'AED charged for the protection package across the rental.';
comment on column public.bookings.addons_total is
  'AED charged for all add-ons across the rental.';
comment on column public.bookings.card_surcharge is
  'AED 3% card surcharge. Zero for pay-on-delivery.';
