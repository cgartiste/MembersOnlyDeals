CREATE TABLE public.pipesend_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipesend_email_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_pipesend_email_templates_updated_at
BEFORE UPDATE ON public.pipesend_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pipesend_email_templates (key, name, subject, html) VALUES
('confirmation', 'Confirmation d''inscription', 'Confirmez votre inscription à la newsletter',
'<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:32px auto;color:#1a1d2e"><h1 style="color:#7c5cff">Confirmez votre inscription</h1><p>Merci pour votre intérêt. Pour finaliser votre inscription, cliquez sur le bouton ci-dessous :</p><p style="margin:24px 0"><a href="{{confirm_url}}" style="background:#7c5cff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirmer mon inscription</a></p><p style="font-size:11px;color:#999">Lien : <a href="{{confirm_url}}">{{confirm_url}}</a></p></body></html>'),
('welcome', 'Bienvenue', 'Bienvenue 🎉',
'<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:32px auto;color:#1a1d2e"><h1 style="color:#7c5cff">Bienvenue 🎉</h1><p>Votre inscription est confirmée. Vous recevrez nos prochaines offres en avant-première.</p><p style="font-size:12px;color:#666">Pour vous désinscrire, répondez « STOP » à ce message.</p></body></html>'),
('reminder', 'Relance confirmation', 'Pensez à confirmer votre inscription',
'<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:32px auto;color:#1a1d2e"><h1 style="color:#7c5cff">Encore une étape</h1><p>Votre inscription est presque finalisée. Cliquez pour confirmer votre adresse :</p><p style="margin:24px 0"><a href="{{confirm_url}}" style="background:#7c5cff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirmer maintenant</a></p></body></html>');