// Minimal Everflow Affiliate API driver.
// Docs: https://developers.everflow.io/ — affiliate API uses `X-Eflow-API-Key` header.
// Default base: https://api.eflow.team

export type EverflowSponsor = {
  api_base: string;   // e.g. https://api.eflow.team
  api_key: string;    // X-Eflow-API-Key value
  affiliate_id: string; // not strictly needed; kept for parity
};

export type EverflowOffer = {
  offer_id: string;
  name: string | null;
  vertical: string | null;
  payout: number | null;
  payout_display: string | null;
  status: string | null;
  html_creative: string | null;
  raw: unknown;
};

type EverflowOfferRaw = {
  network_offer_id?: number;
  name?: string;
  offer_status?: string;
  category?: { name?: string };
  vertical?: { name?: string };
  payout?: number;
  payout_amount?: number;
  payout_type?: string;
  default_payout?: number;
  email_optimized_subject?: string;
  email_optimized_body_html?: string;
};

async function fetchWithTimeout(url: string, init: RequestInit, ms = 30_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchEverflowOffers(
  sponsor: EverflowSponsor,
): Promise<EverflowOffer[]> {
  const base = sponsor.api_base.replace(/\/$/, "");
  // Affiliate API: GET /v1/affiliates/alloffers
  const url = `${base}/v1/affiliates/alloffers?page_size=500`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "X-Eflow-API-Key": sponsor.api_key,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Everflow ${res.status}: ${text.slice(0, 300)}`);
  }
  let json: { offers?: EverflowOfferRaw[] } = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Everflow: réponse non-JSON");
  }
  const offers = json.offers ?? [];
  return offers.map((o) => {
    const payoutNum =
      typeof o.payout === "number"
        ? o.payout
        : typeof o.payout_amount === "number"
        ? o.payout_amount
        : typeof o.default_payout === "number"
        ? o.default_payout
        : null;
    return {
      offer_id: String(o.network_offer_id ?? ""),
      name: o.name ?? null,
      vertical: o.vertical?.name ?? o.category?.name ?? null,
      payout: payoutNum,
      payout_display:
        payoutNum != null
          ? `$${payoutNum.toFixed(2)}${o.payout_type ? " " + o.payout_type : ""}`
          : null,
      status: (o.offer_status ?? "active").toLowerCase(),
      html_creative: o.email_optimized_body_html ?? null,
      raw: o as unknown,
    };
  }).filter((o) => o.offer_id);
}
