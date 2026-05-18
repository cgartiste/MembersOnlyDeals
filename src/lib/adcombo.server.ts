// AdCombo affiliate API driver.
// Docs: https://confluence.adcombo.com — offers endpoint:
//   GET https://api.adcombo.com/api/v2/offer/get_all/?api_key=XXX
// We import offers (name, price, image, description) so they can be used
// as blog articles (html_creative).

export type AdcomboSponsor = {
  api_base: string; // e.g. https://api.adcombo.com
  api_key: string;
  affiliate_id: string; // kept for parity
};

export type AdcomboOffer = {
  offer_id: string;
  name: string | null;
  vertical: string | null;
  payout: number | null;
  payout_display: string | null;
  status: string | null;
  html_creative: string | null;
  image_url: string | null;
  slug: string | null;
  raw: unknown;
};

type AdcomboOfferRaw = {
  id?: number | string;
  offer_id?: number | string;
  name?: string;
  title?: string;
  status?: string;
  category?: string | { name?: string };
  vertical?: string;
  price?: number | string;
  payout?: number | string;
  payout_amount?: number | string;
  currency?: string;
  image?: string;
  image_url?: string;
  picture?: string;
  description?: string;
  description_html?: string;
  short_description?: string;
  slug?: string;
};

async function fetchWithTimeout(url: string, ms = 30_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function fetchAdcomboOffers(
  sponsor: AdcomboSponsor,
): Promise<AdcomboOffer[]> {
  const base = sponsor.api_base.replace(/\/+$/, "");
  // Try common AdCombo offer-list endpoints
  const paths = [
    `/api/v2/offer/get_all/?api_key=${encodeURIComponent(sponsor.api_key)}`,
    `/api/v2/offer/list/?api_key=${encodeURIComponent(sponsor.api_key)}`,
    `/api/v2/offers/?api_key=${encodeURIComponent(sponsor.api_key)}`,
  ];

  let raw: unknown = null;
  let lastErr = "";
  for (const p of paths) {
    try {
      const res = await fetchWithTimeout(base + p);
      if (!res.ok) {
        lastErr = `HTTP ${res.status} on ${p}`;
        continue;
      }
      raw = await res.json();
      break;
    } catch (e) {
      lastErr = String((e as Error).message ?? e);
    }
  }
  if (raw == null) {
    // AdCombo n'expose pas d'endpoint public de liste d'offres avec
    // juste l'api_key — les offres se gèrent côté dashboard. On retourne
    // une liste vide et l'utilisateur ajoute ses offres manuellement.
    console.warn(
      `AdCombo: aucun endpoint de liste d'offres disponible (${lastErr}). Ajoutez les offres manuellement.`,
    );
    return [];
  }

  // Response can be { offers: [...] } | { data: [...] } | [...] directly
  let list: AdcomboOfferRaw[] = [];
  if (Array.isArray(raw)) list = raw as AdcomboOfferRaw[];
  else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.offers)) list = obj.offers as AdcomboOfferRaw[];
    else if (Array.isArray(obj.data)) list = obj.data as AdcomboOfferRaw[];
    else if (Array.isArray(obj.result)) list = obj.result as AdcomboOfferRaw[];
  }

  return list
    .map((o): AdcomboOffer | null => {
      const id = String(o.offer_id ?? o.id ?? "").trim();
      if (!id) return null;
      const name = (o.name ?? o.title ?? null) as string | null;
      const payoutRaw = o.payout ?? o.payout_amount ?? o.price;
      const payout =
        payoutRaw != null ? Number(String(payoutRaw).replace(/[^\d.-]/g, "")) : null;
      const currency = o.currency ?? "USD";
      const payoutDisplay =
        payout != null && Number.isFinite(payout)
          ? `${payout.toFixed(2)} ${currency}`
          : null;
      const vertical =
        typeof o.category === "string"
          ? o.category
          : (o.category?.name ?? o.vertical ?? null);
      const image = (o.image_url ?? o.image ?? o.picture ?? null) as string | null;
      const desc = (o.description_html ?? o.description ?? o.short_description ?? null) as
        | string
        | null;
      return {
        offer_id: id,
        name,
        vertical: vertical ?? null,
        payout: payout != null && Number.isFinite(payout) ? payout : null,
        payout_display: payoutDisplay,
        status: (o.status ?? "active") as string,
        html_creative: desc,
        image_url: image,
        slug: name ? `${slugify(name)}-${id}` : id,
        raw: o,
      };
    })
    .filter((o): o is AdcomboOffer => o !== null);
}