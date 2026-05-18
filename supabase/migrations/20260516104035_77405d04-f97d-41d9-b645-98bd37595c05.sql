
ALTER TABLE public.pipesend_sponsors ADD COLUMN IF NOT EXISTS tracking_link_template text;

CREATE TABLE IF NOT EXISTS public.pipesend_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  source text NOT NULL DEFAULT 'public_form',
  gender text,
  country text,
  interest text,
  motivation text,
  level text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipesend_subscribers_status ON public.pipesend_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_pipesend_subscribers_token ON public.pipesend_subscribers(token);

ALTER TABLE public.pipesend_subscribers ENABLE ROW LEVEL SECURITY;
-- No policies: access is gated through server-side functions using the service-role client.
