
CREATE TABLE public.pipesend_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  driver text NOT NULL DEFAULT 'cake',
  api_base text NOT NULL,
  api_key text NOT NULL,
  affiliate_id text NOT NULL,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pipesend_sponsor_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.pipesend_sponsors(id) ON DELETE CASCADE,
  offer_id text NOT NULL,
  name text,
  vertical text,
  payout numeric,
  payout_display text,
  status text,
  html_creative text,
  raw jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, offer_id)
);

CREATE INDEX idx_offers_sponsor ON public.pipesend_sponsor_offers(sponsor_id);

ALTER TABLE public.pipesend_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipesend_sponsor_offers ENABLE ROW LEVEL SECURITY;

-- No public policies: access strictly via server functions using service role.
-- (RLS enabled with no policies = deny all to anon/authenticated, service role bypasses.)
