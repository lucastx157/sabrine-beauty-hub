ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deposit_cents integer;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_note text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS attendee_name text;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('requested','confirmed','cancelled','rescheduled','pending_payment','no_show'));