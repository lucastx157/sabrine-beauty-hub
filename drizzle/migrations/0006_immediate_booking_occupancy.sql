CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('requested', 'confirmed', 'rescheduled', 'pending_payment', 'no_show') THEN
    UPDATE public.bookings
    SET status = 'cancelled', payment_status = 'expired'
    WHERE booking_date = NEW.booking_date
      AND id <> NEW.id
      AND status = 'pending_payment'
      AND reserved_until IS NOT NULL
      AND reserved_until <= now();
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status IN ('requested', 'confirmed', 'rescheduled', 'pending_payment', 'no_show')
        AND b.booking_date = NEW.booking_date AND b.id <> NEW.id
        AND b.start_time < NEW.end_time AND NEW.start_time < b.end_time
    ) THEN
      RAISE EXCEPTION 'Esse horário não está mais livre. Escolha outro, por favor.' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- The exclusion constraint serializes overlapping concurrent inserts, including
-- transactions whose pre-insert SELECT cannot yet see the competing request.
ALTER TABLE public.bookings ADD CONSTRAINT bookings_exclusive_occupancy
EXCLUDE USING gist (
  tsrange(booking_date + start_time, booking_date + end_time, '[)') WITH &&
) WHERE (status IN ('requested', 'confirmed', 'rescheduled', 'pending_payment', 'no_show'));
