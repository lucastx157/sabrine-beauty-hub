ALTER TABLE public.availability_overrides ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_cents integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_proof_path text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status IN ('confirmed', 'rescheduled', 'pending_payment') THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status IN ('confirmed', 'rescheduled', 'pending_payment')
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