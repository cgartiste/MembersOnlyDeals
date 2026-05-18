
CREATE TABLE IF NOT EXISTS public.pipesend_landings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  html text NOT NULL DEFAULT '',
  image_url text,
  offer_id text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipesend_landings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published landings"
  ON public.pipesend_landings FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated can manage landings"
  ON public.pipesend_landings FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pipesend_landings_slug ON public.pipesend_landings(slug);
CREATE INDEX IF NOT EXISTS idx_pipesend_landings_published ON public.pipesend_landings(published);

CREATE TRIGGER trg_pipesend_landings_updated_at
BEFORE UPDATE ON public.pipesend_landings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
