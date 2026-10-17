-- Record WHICH wallet paid, and stop rejecting bank transfers.
--
-- Two separate problems, one constraint.
--
-- 1. Apple Pay and Google Pay now appear as tabs inside the card form
--    rather than as their own row on the chooser. So payment_method says
--    'card' for a customer who actually paid with a wallet, and there is
--    nowhere to record which.
--
--    The tempting fix -- overwrite payment_method with the wallet brand --
--    is a regression. That column means "what the customer chose" and it
--    drives real behaviour: the cash/card split in the webhook, whether
--    the Cancel button shows, and which bookings land in the admin
--    payments queue. A pay-on-delivery customer who taps Apple Pay for
--    the AED 450 would become payment_method = 'apple_pay' with
--    payment_status = 'pending_cash', which switches Cancel on and tells
--    them "Apple Pay" while they still owe cash at handover. Then
--    confirmManualPayment writes 'cash' back and the row flip-flops.
--
--    So: a separate column. payment_method keeps meaning what the
--    customer chose; payment_wallet records how the money arrived.
--
--    Deliberately NO check constraint. Stripe returns seven values here
--    (amex_express_checkout, apple_pay, google_pay, link, masterpass,
--    samsung_pay, visa_checkout) and may add more. A constraint would turn
--    an unexpected wallet into a failed webhook write on a booking the
--    customer has already paid for -- see the payment_status bug fixed in
--    20261016160000, which was exactly this mistake.
--
-- 2. 'bank_transfer' has never been allowed by the payment_method check
--    constraint, yet confirmManualPayment writes it and "Bank Transfer" is
--    a selectable option in two admin screens (BookingsTab, PaymentsTab).
--    Confirming a bank transfer therefore fails today, on the live site.
--    Found while tracing the wallet work, unrelated to it.
--
-- Idempotent: safe to re-run.

alter table public.bookings
  add column if not exists payment_wallet text;

comment on column public.bookings.payment_wallet is
  'Which wallet the money actually arrived through (apple_pay, google_pay, ...), read from Stripe by the webhook. NULL for a plain card or any non-Stripe method. Reporting only -- payment_method is what drives behaviour.';

-- 'bank_transfer' added: the admin writes it and the constraint rejected it.
alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings add constraint bookings_payment_method_check
  check (payment_method in (
    'card', 'apple_pay', 'google_pay', 'cash', 'crypto', 'bank_transfer'
  ));

-- 'apple_pay' and 'google_pay' stay allowed on purpose. The chooser can no
-- longer produce them, but historical rows hold them and a stale browser
-- session can still restore one.

-- 3. Same bug again, third instance: the payment_intent.payment_failed
--    handler writes payment_status = 'failed', which the constraint has
--    never allowed. That write is also unchecked, so it silently no-ops
--    and a failed payment is never recorded as failed -- the booking just
--    stays 'unpaid'. Benign in effect, broken in fact.
--
--    This is the same shape as the 'forfeited' bug fixed in
--    20261016160000 and the 'bank_transfer' one above: a vocabulary that
--    drifted away from the code writing into it. Worth a periodic sweep.
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in (
    'unpaid', 'paid', 'pending_cash', 'pending_crypto',
    'refunded', 'partially_refunded', 'forfeited', 'failed'
  ));
