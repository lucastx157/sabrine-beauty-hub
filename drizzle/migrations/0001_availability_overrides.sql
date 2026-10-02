CREATE TABLE public.availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  available_date date NOT NULL,
  start_time time WITHOUT TIME ZONE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_overrides TO authenticated;
GRANT ALL ON public.availability_overrides TO service_role;

ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability_overrides"
ON public.availability_overrides
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_availability_overrides_date ON public.availability_overrides (available_date);