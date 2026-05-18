import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
});

export type SponsorRow = {
  id: string;
  api_base: string;
  api_key: string;
  affiliate_id: string;
};

export type NormalizedOffer = {
  offer_id: string;
  name: string | null;
  vertical: string | null;
  payout: number | null;
  payout_display: string | null;
  status: string | null;
  html_creative: string | null;
  raw: unknown;
};

const VERSIONS = ["1", "4", "3", "2"];

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseXmlNullable(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if (obj["nil"] === "true" || obj["xsi:nil"] === "true") return null;
    if ("#text" in obj) return String(obj["#text"]);
    return null;
  }
  return String(v);
}

function parseCakePayout(v: unknown): { value: number | null; display: string | null } {
  const raw = parseXmlNullable(v);
  if (!raw) return { value: null, display: null };
  const num = parseFloat(raw.replace(/[^\d.-]/g, ""));
  return {
    value: Number.isFinite(num) ? num : null,
    display: raw.startsWith("$") ? raw : Number.isFinite(num) ? `$${num.toFixed(2)}` : raw,
  };
}

function decodeHtmlEntities(s: string | null): string | null {
  if (!s) return s;
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

async function fetchWithTimeout(url: string, ms = 30_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchVersioned(
  sponsor: SponsorRow,
  pathBuilder: (v: string) => string
): Promise<{ version: string; items: unknown[]; debug: string[] }> {
  let lastError: unknown = null;
  const debug: string[] = [];
  for (const version of VERSIONS) {
    try {
      const url = `${sponsor.api_base.replace(/\/$/, "")}/${version}/${pathBuilder(version)}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        debug.push(`v${version}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      if (xml.includes("Invalid API Key") || xml.includes("invalid_api_key")) {
        throw new Error("Invalid API Key — vérifie clé affilié et affiliate_id");
      }
      const parsed = parser.parse(xml) as Record<string, unknown>;
      const items = extractItems(parsed);
      debug.push(`v${version}: ${items.length} items`);
      if (items.length > 0) return { version, items, debug };
    } catch (err) {
      lastError = err;
      debug.push(`v${version}: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.message.startsWith("Invalid API Key")) throw err;
    }
  }
  if (lastError) console.warn("[cake] all versions failed:", lastError);
  return { version: "", items: [], debug };
}

function extractItems(parsed: Record<string, unknown>): unknown[] {
  const queue: unknown[] = [parsed];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const k = key.toLowerCase();
      // Skip wrappers like ArrayOfOffer / Offers — we want the leaf <Offer> / <Creative>
      if ((k === "offer" || k === "creative") && value && typeof value === "object") {
        return toArray(value as unknown);
      }
      if (typeof value === "object" && value !== null) queue.push(value);
    }
  }
  return [];
}

export async function fetchOffers(sponsor: SponsorRow): Promise<unknown[]> {
  const result = await fetchVersioned(sponsor, () =>
    `offers.asmx/OfferFeed?api_key=${encodeURIComponent(sponsor.api_key)}&affiliate_id=${encodeURIComponent(sponsor.affiliate_id)}`
  );
  return result.items;
}

export async function fetchCreatives(
  sponsor: SponsorRow
): Promise<Record<string, { html: string | null }>> {
  const result = await fetchVersioned(sponsor, () =>
    `creatives.asmx/CreativeFeed?api_key=${encodeURIComponent(sponsor.api_key)}&affiliate_id=${encodeURIComponent(sponsor.affiliate_id)}`
  );
  const map: Record<string, { html: string | null }> = {};
  for (const item of result.items) {
    const obj = item as Record<string, unknown>;
    const offerId =
      parseXmlNullable(obj.offer_id) ??
      parseXmlNullable(obj.OfferId) ??
      parseXmlNullable(obj.campaign_id);
    if (!offerId) continue;
    const html = decodeHtmlEntities(
      parseXmlNullable(obj.creative_code) ??
      parseXmlNullable(obj.code_html) ??
      parseXmlNullable(obj.html_code) ??
      parseXmlNullable(obj.html) ??
      parseXmlNullable(obj.creative_html) ??
      parseXmlNullable(obj.code) ??
      parseXmlNullable(obj.ad_code)
    ) ?? null;
    if (html) map[offerId] = { html };
  }
  return map;
}

export type CakeCreativeVariant = {
  creative_id: string | null;
  creative_name: string | null;
  creative_type: string | null;
  html: string | null;
  tracking_url: string | null;
};

export async function fetchOfferCreatives(
  sponsor: SponsorRow,
  campaignId: string
): Promise<{ variants: CakeCreativeVariant[]; debug: string[] }> {
  const debug: string[] = [];
  // Endpoint name & params vary across CAKE installs. Try combinations.
  const endpoints = [
    "creative.asmx/GetCreatives",
    "creatives.asmx/GetCreatives",
    "creatives.asmx/CreativeFeed",
    "creative.asmx/CreativeFeed",
  ];
  const paramVariants = [
    `campaign_id=${encodeURIComponent(campaignId)}&creative_type_id=0&media_type_id=0`,
    `campaign_id=${encodeURIComponent(campaignId)}&creative_type=html`,
    `campaign_id=${encodeURIComponent(campaignId)}`,
    `offer_id=${encodeURIComponent(campaignId)}&creative_type=html`,
    `offer_id=${encodeURIComponent(campaignId)}`,
  ];

  for (const endpoint of endpoints) {
    for (const params of paramVariants) {
      const result = await fetchVersioned(
        sponsor,
        () =>
          `${endpoint}?api_key=${encodeURIComponent(sponsor.api_key)}&affiliate_id=${encodeURIComponent(sponsor.affiliate_id)}&${params}`,
      );
      debug.push(`${endpoint}?${params} → ${result.debug.join(" | ")}`);
      if (result.items.length === 0) continue;

    const variants = result.items
      .map((raw): CakeCreativeVariant => {
        const o = raw as Record<string, unknown>;
        return {
          creative_id: parseXmlNullable(o.creative_id) ?? parseXmlNullable(o.id),
          creative_name:
            parseXmlNullable(o.creative_name) ??
            parseXmlNullable(o.name) ??
            parseXmlNullable(o.display_name),
          creative_type:
            parseXmlNullable(o.creative_type) ??
            parseXmlNullable(o.type) ??
            parseXmlNullable(o.media_type),
          html: decodeHtmlEntities(
            parseXmlNullable(o.creative_code) ??
              parseXmlNullable(o.code_html) ??
              parseXmlNullable(o.html) ??
              parseXmlNullable(o.code) ??
              parseXmlNullable(o.ad_code) ??
              parseXmlNullable(o.creative_file),
          ),
          tracking_url:
            parseXmlNullable(o.tracking_url) ?? parseXmlNullable(o.click_url),
        };
      })
      .filter((v) => v.html);

      if (variants.length > 0) return { variants, debug };
    }
  }

  return { variants: [], debug };
}

export async function fetchOfferCreativesViaFeed(
  sponsor: SponsorRow,
  campaignId: string,
): Promise<{ variants: CakeCreativeVariant[]; debug: string[] }> {
  const debug: string[] = [];
  const result = await fetchVersioned(sponsor, () =>
    `creatives.asmx/CreativeFeed?api_key=${encodeURIComponent(sponsor.api_key)}&affiliate_id=${encodeURIComponent(sponsor.affiliate_id)}`,
  );
  debug.push(`CreativeFeed → ${result.debug.join(" | ")}`);
  const variants: CakeCreativeVariant[] = [];
  for (const item of result.items) {
    const o = item as Record<string, unknown>;
    const offerId =
      parseXmlNullable(o.offer_id) ??
      parseXmlNullable(o.OfferId) ??
      parseXmlNullable(o.campaign_id);
    if (offerId !== campaignId) continue;
    const html = decodeHtmlEntities(
      parseXmlNullable(o.creative_code) ??
        parseXmlNullable(o.code_html) ??
        parseXmlNullable(o.html) ??
        parseXmlNullable(o.creative_html) ??
        parseXmlNullable(o.code) ??
        parseXmlNullable(o.ad_code),
    );
    if (!html) continue;
    variants.push({
      creative_id: parseXmlNullable(o.creative_id) ?? parseXmlNullable(o.id),
      creative_name:
        parseXmlNullable(o.creative_name) ??
        parseXmlNullable(o.name) ??
        parseXmlNullable(o.display_name),
      creative_type:
        parseXmlNullable(o.creative_type) ??
        parseXmlNullable(o.type) ??
        parseXmlNullable(o.media_type),
      html,
      tracking_url:
        parseXmlNullable(o.tracking_url) ?? parseXmlNullable(o.click_url),
    });
  }
  debug.push(`CreativeFeed matched ${variants.length} for offer ${campaignId}`);
  return { variants, debug };
}

function looksLikeHtml(s: string | null): boolean {
  if (!s) return false;
  const t = s.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<body") || t.includes("<table");
}

export function normalizeOffer(raw: unknown): NormalizedOffer | null {
  const o = raw as Record<string, unknown>;
  const offerId = parseXmlNullable(o.offer_id) ?? parseXmlNullable(o.OfferId);
  if (!offerId) return null;
  const payout = parseCakePayout(o.payout ?? o.price);

  // CX3ADS stores HTML creative in the description field
  const descRaw = decodeHtmlEntities(parseXmlNullable(o.description) ?? null);
  const htmlFromDesc = descRaw && looksLikeHtml(descRaw) ? descRaw : null;

  return {
    offer_id: offerId,
    name: parseXmlNullable(o.name) ?? parseXmlNullable(o.offer_name),
    vertical:
      parseXmlNullable(o.vertical) ??
      parseXmlNullable(o.vertical_name) ??
      null,
    payout: payout.value,
    payout_display: payout.display,
    status:
      parseXmlNullable(o.offer_status) ??
      parseXmlNullable(o.status) ??
      parseXmlNullable(o.status_name) ??
      "active",
    html_creative:
      decodeHtmlEntities(parseXmlNullable(o.html_creative) ?? null) ?? htmlFromDesc,
    raw: o,
  };
}