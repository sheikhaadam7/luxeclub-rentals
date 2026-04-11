-- Reservation fee model: instead of charging the full booking amount up
-- front, we charge a flat reservation fee (capped at the booking total)
-- to secure the booking. The remainder is paid in person on pickup day.
-- The reservation fee is forfeited on no-show or late (<24h) cancel.

-- Amount actually charged at booking time (AED). min(RESERVATION_FEE_AED, total_due).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reservation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Lifecycle of the reservation fee. Distinct from payment_status so admins
-- can see at a glance whether the up-front fee has been collected, refunded,
-- or forfeited.
--   pending   = customer hasn't yet paid the fee (e.g. cash path)
--   paid      = fee has been collected (card charge, crypto settled, or cash received)
--   refunded  = fee was returned to the customer (cancellation >24h before start)
--   forfeited = fee was retained (no-show or cancellation <24h before start)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reservation_fee_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (reservation_fee_status IN ('pending', 'paid', 'refunded', 'forfeited'));

-- What the customer still owes on pickup day (total_due - reservation_fee).
-- Includes any damage deposit hold and no-deposit surcharge that the
-- customer opted into — those are all settled in person.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS balance_due_on_pickup NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Only set when a booking is cancelled and the reservation fee is kept.
--   no_show     = customer never showed up
--   late_cancel = customer cancelled within 24h of booking start
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS forfeit_reason TEXT
    CHECK (forfeit_reason IS NULL OR forfeit_reason IN ('no_show', 'late_cancel'));

COMMENT ON COLUMN bookings.reservation_fee IS 'Flat reservation fee charged at booking time (min of RESERVATION_FEE_AED and total_due).';
COMMENT ON COLUMN bookings.reservation_fee_status IS 'pending | paid | refunded | forfeited';
COMMENT ON COLUMN bookings.balance_due_on_pickup IS 'Amount still owed by the customer on pickup day (total_due - reservation_fee).';
COMMENT ON COLUMN bookings.forfeit_reason IS 'Why the reservation fee was retained: no_show or late_cancel.';
