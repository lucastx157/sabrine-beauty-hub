CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_min INTEGER,
  price_max INTEGER,
  duration_min INTEGER,
  duration_max INTEGER,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled')),
  original_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id TEXT UNIQUE,
  event TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_booking_datetime_after_hours(_booking public.bookings, _hours INTEGER)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT (timezone('UTC', now()) < ((($1.booking_date)::text || ' ' || ($1.start_time)::text)::timestamptz - ($2 || ' hours')::interval));
$$;

CREATE OR REPLACE FUNCTION public.update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_overlapping_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.status = 'confirmed'
        AND b.booking_date = NEW.booking_date
        AND b.id <> NEW.id
        AND (
          (b.start_time, b.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
        )
    ) THEN
      RAISE EXCEPTION 'Horário já reservado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_no_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_overlapping_bookings();

CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_availability_day ON public.availability(day_of_week);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

GRANT SELECT ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;

GRANT USAGE ON TYPE public.app_role TO authenticated;
GRANT USAGE ON TYPE public.app_role TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app_config" ON public.app_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active services" ON public.services
  FOR SELECT TO authenticated, anon USING (active = TRUE);

CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage availability" ON public.availability
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bookings" ON public.bookings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage whatsapp events" ON public.whatsapp_webhook_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (key, value) VALUES
  ('notification_whatsapp_number', ''),
  ('business_name', 'Sabrine Beauty'),
  ('cancellation_policy_text', 'Cancelamento ou reagendamento só é permitido até 24 horas antes do horário marcado.'),
  ('advance_booking_days', '7')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.services (slug, name, description, price_min, price_max, duration_min, duration_max, category, sort_order) VALUES
  ('design-sem-henna', 'Design sem Henna', 'Modelagem profissional das sobrancelhas respeitando o formato natural e a simetria do seu rosto.', 4500, 5500, 10, 20, 'Sobrancelhas', 1),
  ('design-com-henna', 'Design com Henna', 'Design personalizado com henna de alta fixação para preencher falhas e dar mais definição ao olhar.', 7000, 8000, 25, 30, 'Sobrancelhas', 2),
  ('coloracao', 'Coloração', 'Coloração específica para os fios das sobrancelhas, ideal para uniformizar a cor e destacar a expressão.', 4000, 5000, 10, 20, 'Sobrancelhas', 3),
  ('hydra-gloss', 'Hydra Gloss', 'Hidratação profunda, regeneração e revitalização labial. Lábios macios, nutridos e com efeito gloss natural.', 8900, 12000, 30, 50, 'Lábios', 4),
  ('brow-lamination', 'Brow Lamination', 'Técnica que alinha, disciplina e fixa os fios para cima, com efeito volumoso, moderno e sofisticado.', 9000, 12000, 40, 40, 'Sobrancelhas', 5)
ON CONFLICT (slug) DO NOTHING;
