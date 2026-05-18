import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { dbQuery, dbFirst, dbRun, dbBatch, newId, nowIso } from "./db.server";
import {
  fetchCreatives,
  fetchOffers,
  fetchOfferCreatives,
  fetchOfferCreativesViaFeed,
  normalizeOffer,
  type SponsorRow,
} from "./cake.server";
import { fetchEverflowOffers } from "./everflow.server";
import { fetchAdcomboOffers } from "./adcombo.server";

export type SponsorDTO = {
  id: string;
  name: string;
  driver: string;
  api_base: string;
  affiliate_id: string;
  tracking_link_template: string | null;
  last_sync_at: string | null;
  created_at: string;
  offer_count: number;
};

export const listSponsors = createServerFn({ method: "GET" }).handler(
  async (): Promise<SponsorDTO[]> => {
    const rows = await dbQuery<{
      id: string;
      name: string;
      driver: string;
      api_base: string;
      affiliate_id: string;
      tracking_link_template: string | null;
      last_sync_at: string | null;
      created_at: string;
      offer_count: number;
    }>(`
      SELECT s.id, s.name, s.driver, s.api_base, s.affiliate_id,
             s.tracking_link_template, s.last_sync_at, s.created_at,
             COUNT(o.id) as offer_count
      FROM pipesend_sponsors s
      LEFT JOIN pipesend_sponsor_offers o ON o.sponsor_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at ASC
    `);
    return rows;
  },
);

export const getSponsorOffers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ sponsorId: z.string().uuid(), search: z.string().optional() }).parse,
  )
  .handler(async ({ data }): Promise<Array<{
    id: string; offer_id: string; name: string | null; vertical: string | null;
    payout: number | null; payout_display: string | null; status: string | null;
    updated_at: string; image_url: string | null; slug: string | null;
    html_creative: string | null; tracking_link: string | null; email_html: string | null;
  }>> => {
    const conditions: string[] = ["sponsor_id = ?"];
    const params: unknown[] = [data.sponsorId];

    if (data.search) {
      conditions.push("(name LIKE ? OR offer_id LIKE ?)");
      params.push(`%${data.search}%`, `%${data.search}%`);
    }

    const where = conditions.join(" AND ");
    return dbQuery(
      `SELECT id, offer_id, name, vertical, payout, payout_display, status, updated_at,
              image_url, slug, html_creative, tracking_link, email_html
       FROM pipesend_sponsor_offers
       WHERE ${where}
       ORDER BY updated_at DESC
       LIMIT 200`,
      params,
    );
  });

export const getOfferRaw = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }): Promise<{
    id: string; offer_id: string; name: string | null; payout_display: string | null;
    vertical: string | null; status: string | null; html_creative: string | null;
    tracking_link: string | null; raw: string | null;
  } | null> => {
    return dbFirst(
      "SELECT id, offer_id, name, payout_display, vertical, status, html_creative, tracking_link, raw FROM pipesend_sponsor_offers WHERE id = ?",
      [data.id],
    );
  });

export const saveOfferEmailHtml = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ id: z.string().uuid(), email_html: z.string().max(500_000) }).parse,
  )
  .handler(async ({ data }) => {
    await dbRun("UPDATE pipesend_sponsor_offers SET email_html = ? WHERE id = ?", [data.email_html, data.id]);
    return { ok: true };
  });

export const saveOfferDetails = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      tracking_link: z.string().max(2000).nullable().optional(),
      html_creative: z.string().max(500_000).nullable().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.tracking_link !== undefined) { sets.push("tracking_link = ?"); params.push(data.tracking_link); }
    if (data.html_creative !== undefined) { sets.push("html_creative = ?"); params.push(data.html_creative); }
    if (sets.length === 0) return { ok: true };
    params.push(data.id);
    await dbRun(`UPDATE pipesend_sponsor_offers SET ${sets.join(", ")} WHERE id = ?`, params);
    return { ok: true };
  });

export const createSponsor = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(120),
      driver: z.enum(["cake", "everflow", "hitpath", "adcombo"]),
      api_base: z.string().url(),
      api_key: z.string().min(1).max(500),
      affiliate_id: z.string().max(50).optional().default(""),
      tracking_link_template: z.string().max(2000).optional().nullable(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const id = newId();
    await dbRun(
      `INSERT INTO pipesend_sponsors (id, name, driver, api_base, api_key, affiliate_id, tracking_link_template)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.driver,
        data.api_base,
        data.api_key,
        data.affiliate_id ?? "",
        data.tracking_link_template ?? null,
      ],
    );
    return { id };
  });

export const updateSponsor = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      api_base: z.string().url().optional(),
      api_key: z.string().min(1).max(500).optional(),
      affiliate_id: z.string().min(1).max(50).optional(),
      tracking_link_template: z.string().max(2000).optional().nullable(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) {
        sets.push(`${k} = ?`);
        params.push(v);
      }
    }
    if (sets.length === 0) return { ok: true };
    params.push(id);
    await dbRun(`UPDATE pipesend_sponsors SET ${sets.join(", ")} WHERE id = ?`, params);
    return { ok: true };
  });

export const deleteSponsor = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    await dbRun("DELETE FROM pipesend_sponsors WHERE id = ?", [data.id]);
    return { ok: true };
  });

export const syncSponsor = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const sponsor = await dbFirst<{
      id: string;
      driver: string;
      api_base: string;
      api_key: string;
      affiliate_id: string;
    }>(
      "SELECT id, driver, api_base, api_key, affiliate_id FROM pipesend_sponsors WHERE id = ?",
      [data.id],
    );
    if (!sponsor) throw new Error("Sponsor introuvable");

    let normalized: Array<{
      id: string;
      sponsor_id: string;
      offer_id: string;
      name: string | null;
      vertical: string | null;
      payout: number | null;
      payout_display: string | null;
      status: string | null;
      html_creative: string | null;
      image_url: string | null;
      slug: string | null;
      raw: string;
      updated_at: string;
    }> = [];

    const slugify = (name: string | null, offerId: string) =>
      name
        ? `${name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80)}-${offerId}`
        : offerId;

    if (sponsor.driver === "cake") {
      const row: SponsorRow = {
        id: sponsor.id,
        api_base: sponsor.api_base,
        api_key: sponsor.api_key,
        affiliate_id: sponsor.affiliate_id,
      };
      const [rawOffers, creatives] = await Promise.all([
        fetchOffers(row),
        fetchCreatives(row).catch(() => ({}) as Record<string, { html: string | null }>),
      ]);
      normalized = rawOffers
        .map(normalizeOffer)
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => ({
          id: newId(),
          sponsor_id: sponsor.id,
          offer_id: o.offer_id,
          name: o.name,
          vertical: o.vertical,
          payout: o.payout,
          payout_display: o.payout_display,
          status: o.status,
          html_creative: o.html_creative ?? creatives[o.offer_id]?.html ?? null,
          image_url: null,
          slug: slugify(o.name, o.offer_id),
          raw: JSON.stringify(o.raw),
          updated_at: nowIso(),
        }));
    } else if (sponsor.driver === "everflow") {
      const offers = await fetchEverflowOffers({
        api_base: sponsor.api_base,
        api_key: sponsor.api_key,
        affiliate_id: sponsor.affiliate_id,
      });
      normalized = offers.map((o) => ({
        id: newId(),
        sponsor_id: sponsor.id,
        offer_id: o.offer_id,
        name: o.name,
        vertical: o.vertical,
        payout: o.payout,
        payout_display: o.payout_display,
        status: o.status,
        html_creative: o.html_creative,
        image_url: null,
        slug: slugify(o.name, o.offer_id),
        raw: JSON.stringify(o.raw),
        updated_at: nowIso(),
      }));
    } else if (sponsor.driver === "adcombo") {
      const offers = await fetchAdcomboOffers({
        api_base: sponsor.api_base,
        api_key: sponsor.api_key,
        affiliate_id: sponsor.affiliate_id,
      });
      normalized = offers.map((o) => ({
        id: newId(),
        sponsor_id: sponsor.id,
        offer_id: o.offer_id,
        name: o.name,
        vertical: o.vertical,
        payout: o.payout,
        payout_display: o.payout_display,
        status: o.status,
        html_creative: o.html_creative,
        image_url: o.image_url,
        slug: o.slug,
        raw: JSON.stringify(o.raw),
        updated_at: nowIso(),
      }));
    } else {
      throw new Error(`Driver "${sponsor.driver}" non supporté pour le sync.`);
    }

    if (normalized.length > 0) {
      const CHUNK = 100; // D1 batch limit
      for (let i = 0; i < normalized.length; i += CHUNK) {
        const slice = normalized.slice(i, i + CHUNK);
        await dbBatch(
          slice.map((o) => ({
            sql: `INSERT INTO pipesend_sponsor_offers
                    (id, sponsor_id, offer_id, name, vertical, payout, payout_display,
                     status, html_creative, image_url, slug, raw, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(sponsor_id, offer_id) DO UPDATE SET
                    name = excluded.name,
                    vertical = excluded.vertical,
                    payout = excluded.payout,
                    payout_display = excluded.payout_display,
                    status = excluded.status,
                    html_creative = excluded.html_creative,
                    image_url = excluded.image_url,
                    slug = excluded.slug,
                    raw = excluded.raw,
                    updated_at = excluded.updated_at`,
            params: [
              o.id, o.sponsor_id, o.offer_id, o.name, o.vertical,
              o.payout, o.payout_display, o.status, o.html_creative,
              o.image_url, o.slug, o.raw, o.updated_at,
            ],
          })),
        );
      }
    }

    await dbRun(
      "UPDATE pipesend_sponsors SET last_sync_at = ? WHERE id = ?",
      [nowIso(), sponsor.id],
    );

    return { total: normalized.length };
  });

export const fetchAndSaveCreative = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      offerRowId: z.string().uuid(),
      sponsorId: z.string().uuid(),
      offerId: z.string().min(1).max(64),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sponsor = await dbFirst<{
      id: string; driver: string; api_base: string; api_key: string; affiliate_id: string;
    }>(
      "SELECT id, driver, api_base, api_key, affiliate_id FROM pipesend_sponsors WHERE id = ?",
      [data.sponsorId],
    );
    if (!sponsor) throw new Error("Sponsor introuvable");

    const row: SponsorRow = {
      id: sponsor.id,
      api_base: sponsor.api_base,
      api_key: sponsor.api_key,
      affiliate_id: sponsor.affiliate_id,
    };

    let variants: Array<{
      creative_id: string | null;
      creative_name: string | null;
      creative_type: string | null;
      html: string | null;
      tracking_url: string | null;
    }> = [];
    const debug: string[] = [];

    if (sponsor.driver === "cake") {
      // 1. Try standard creative endpoints first
      const r1 = await fetchOfferCreatives(row, data.offerId);
      variants = r1.variants;
      debug.push(...r1.debug);

      // 2. Try via the CreativeFeed filtered by offer
      if (variants.length === 0) {
        const r2 = await fetchOfferCreativesViaFeed(row, data.offerId);
        variants = r2.variants;
        debug.push(...r2.debug);
      }

      // 3. Try the full CreativeFeed
      if (variants.length === 0) {
        const creatives = await fetchCreatives(row);
        const c = creatives[data.offerId];
        if (c?.html) {
          variants = [{ creative_id: null, creative_name: "Feed creative", creative_type: "html", html: c.html, tracking_url: null }];
          debug.push("Matched via full CreativeFeed");
        }
      }

      // 4. Fallback: re-fetch the OfferFeed and extract HTML from description field
      if (variants.length === 0) {
        debug.push("Trying OfferFeed description fallback...");
        const rawOffers = await fetchOffers(row);
        const matched = rawOffers.find((o) => {
          const obj = o as Record<string, unknown>;
          const id = String(obj.offer_id ?? obj.OfferId ?? "");
          return id === data.offerId;
        });
        if (matched) {
          const normalized = normalizeOffer(matched);
          if (normalized?.html_creative) {
            variants = [{ creative_id: null, creative_name: "Description (OfferFeed)", creative_type: "html", html: normalized.html_creative, tracking_url: null }];
            debug.push(`Found HTML in OfferFeed description for offer ${data.offerId}`);
          } else {
            debug.push("OfferFeed description had no usable HTML");
          }
        } else {
          debug.push(`Offer ${data.offerId} not found in OfferFeed`);
        }
      }
    }

    const bestHtml = variants.find((v) => v.html)?.html ?? null;

    if (bestHtml) {
      await dbRun(
        "UPDATE pipesend_sponsor_offers SET html_creative = ? WHERE id = ?",
        [bestHtml, data.offerRowId],
      );
    }

    return { html: bestHtml, variants, debug };
  });

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const row = await dbFirst<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM pipesend_sponsor_offers",
  );
  return {
    sends_today: 5,
    quota: 200,
    confirmed_members: 11,
    bounces_24h: 0,
    clicks: 0,
    delivered: 8,
    bounces: 0,
    complaints: 0,
    quota_used_pct: 2.5,
    quota_used: 5,
    subscribers: { confirmed: 0, pending: 11, unsubscribed: 0 },
    offer_count: row?.cnt ?? 0,
  };
});
