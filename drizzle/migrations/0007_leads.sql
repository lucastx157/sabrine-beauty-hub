CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  city text,
  interest text,
  message text,
  source text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'agendou', 'sem_interesse')),
  follow_up_on date,
  admin_note text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
--> statement-breakpoint
GRANT ALL ON public.leads TO service_role;
--> statement-breakpoint
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
