-- Record how much we asked for, and how much actually arrived.
--
-- Until now every booking collected the same flat AED 450 online, so
-- "what did this customer pay" was answerable from reservation_fee and
-- nobody needed another column. That stops being true the moment the card
-- option charges the whole rental: the amount taken becomes per-booking,
-- and reservation_fee goes back to meaning only what it says -- the
-- non-refundable slice a late cancellation forfeits.
--
-- The two are now different numbers and must not be conflated. A card
-- customer who pays AED 8,000 has amount_paid = 8000 and
-- reservation_fee = 450; cancelling inside 24 hours refunds 7,550.
--
-- Idempotent: safe to re-run.

alter table public.bookings
  -- What we asked Stripe (or NOWPayments) for at checkout. For card,
  -- Apple Pay and crypto this is the full total; for pay-on-delivery it
  -- is the capped 450. Nullable: a draft that never reached payment has
  -- no figure, and that is not the same as zero.
  add column if not exists amount_due_now numeric(10,2),

  -- What actually arrived, written by the payment webhooks from the
  -- provider's own figure -- never from anything the browser sent. The
  -- refund paths read Stripe directly rather than trusting this column,
  -- so it is a record for reconciliation and for the admin screen, not
  -- an authority over money.
  add column if not exists amount_paid numeric(10,2);

-- Backfill, or every booking already paid for would refund nothing.
--
-- The cancellation code reads amount_paid, finds null, coerces it to 0,
-- and the "> 0" guard then skips the Stripe call entirely -- while still
-- marking the row refunded. Every one of those bookings collected exactly
-- reservation_fee, because that was the only amount the old code ever
-- charged, so that is the correct historical value.
update public.bookings
   set amount_paid = reservation_fee
 where amount_paid is null
   and reservation_fee_status = 'paid';

-- Same reasoning for what we asked for: historically it was always the
-- reservation fee, on every path.
update public.bookings
   set amount_due_now = reservation_fee
 where amount_due_now is null
   and reservation_fee is not null;

-- Status vocabularies.
--
-- Two problems. The new one: a part-refunded cancellation is neither
-- 'refunded' nor 'forfeited', and calling it either misstates what the
-- customer got back.
--
-- The pre-existing one: cancelBooking already writes
-- payment_status = 'forfeited' on a late cancellation, and 'forfeited' was
-- never in the allowed list. That update fails the check constraint, the
-- action returns "Failed to update booking after cancellation", and the
-- booking stays active -- today, on the live site, for every late
-- cancellation. Verified against the live database, not inferred.
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in (
    'unpaid', 'paid', 'pending_cash', 'pending_crypto',
    'refunded', 'partially_refunded', 'forfeited'
  ));

alter table public.bookings drop constraint if exists bookings_reservation_fee_status_check;
alter table public.bookings add constraint bookings_reservation_fee_status_check
  check (reservation_fee_status in (
    'pending', 'paid', 'refunded', 'partially_refunded', 'forfeited'
  ));

comment on column public.bookings.amount_due_now is
  'AED requested online at checkout. Full total for card/wallet/crypto; capped 450 for pay-on-delivery.';
comment on column public.bookings.amount_paid is
  'AED actually received, written by the payment webhooks. Refunds verify against Stripe, not this column.';

-- Restated: the 3% is no longer waived on pay-on-delivery, only deferred
-- into the balance settled at handover. The previous comment said "Zero
-- for pay-on-delivery", which stops being true.
comment on column public.bookings.card_surcharge is
  'AED 3% processing surcharge. Applies to every method; pay-on-delivery defers it into the balance. Shown to customers as "Booking & processing fee".';
