ALTER TABLE public.pipesend_sponsor_offers
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS pipesend_sponsor_offers_slug_key
  ON public.pipesend_sponsor_offers (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS pipesend_sponsor_offers_sponsor_idx
  ON public.pipesend_sponsor_offers (sponsor_id);