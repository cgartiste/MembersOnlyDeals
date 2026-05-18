CREATE TABLE public.pipesend_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  price text,
  image_url text,
  html text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipesend_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published products"
ON public.pipesend_products FOR SELECT
USING (published = true);

CREATE POLICY "Authenticated can manage products"
ON public.pipesend_products FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_pipesend_products_updated_at
BEFORE UPDATE ON public.pipesend_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pipesend_products_slug ON public.pipesend_products(slug);
CREATE INDEX idx_pipesend_products_published ON public.pipesend_products(published, updated_at DESC);