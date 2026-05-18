CREATE TABLE public.pipesend_email_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text,
  subscriber_id uuid,
  email text,
  sell_link text NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_clicks_subscriber ON public.pipesend_email_clicks(subscriber_id);
CREATE INDEX idx_email_clicks_created ON public.pipesend_email_clicks(created_at DESC);

ALTER TABLE public.pipesend_email_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read clicks"
ON public.pipesend_email_clicks
FOR SELECT
TO authenticated
USING (true);