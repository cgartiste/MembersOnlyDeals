
CREATE TABLE public.pipesend_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid,
  offer_id text,
  offer_name text,
  payout numeric,
  recipient_count integer NOT NULL DEFAULT 1,
  estimated_revenue numeric NOT NULL DEFAULT 0,
  subject text,
  from_email text,
  mailgun_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipesend_email_sends_created_at ON public.pipesend_email_sends(created_at DESC);
CREATE INDEX idx_pipesend_email_sends_sponsor ON public.pipesend_email_sends(sponsor_id);

ALTER TABLE public.pipesend_email_sends ENABLE ROW LEVEL SECURITY;
