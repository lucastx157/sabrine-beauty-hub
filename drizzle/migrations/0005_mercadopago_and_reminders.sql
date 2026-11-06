ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS reserved_until timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('confirmed', 'rescheduled', 'pending_payment') THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status IN ('confirmed', 'rescheduled', 'pending_payment')
        AND NOT (b.status = 'pending_payment' AND b.reserved_until IS NOT NULL AND b.reserved_until < now())
        AND b.booking_date = NEW.booking_date
        AND b.id <> NEW.id
        AND ((b.start_time, b.end_time) OVERLAPS (NEW.start_time, NEW.end_time))
    ) THEN
      RAISE EXCEPTION 'Horário já reservado';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;