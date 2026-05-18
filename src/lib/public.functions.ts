import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbQuery, dbFirst } from "./db.server";
import { fetchOfferCreatives, fetchOfferCreativesViaFeed, type SponsorRow } from "./cake.server";

export type PublicOfferCard = {
  id: string;
  offer_id: string;
  slug: string | null;
  name: string | null;
  vertical: string | null;
  payout_display: string | null;
  image_url: string | null;
};

export const listPublicOffers = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicOfferCard[]> => {
    return dbQuery(
      "SELECT id, offer_id, slug, name, vertical, payout_display, image_url FROM pipesend_sponsor_offers ORDER BY updated_at DESC LIMIT 60",
    );
  },
);

export const getPublicOffer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().min(1).max(200) }).parse)
  .handler(async ({ data }): Promise<null | {
    id: string; offer_id: string; slug: string | null; name: string | null;
    vertical: string | null; payout_display: string | null; image_url: string | null;
    html: string | null; updated_at: string;
  }> => {
    const row = await dbFirst<{
      id: string; offer_id: string; slug: string | null; name: string | null;
      vertical: string | null; payout_display: string | null; image_url: string | null;
      html_creative: string | null; updated_at: string;
    }>(
      "SELECT id, offer_id, slug, name, vertical, payout_display, image_url, html_creative, updated_at FROM pipesend_sponsor_offers WHERE slug = ?",
      [data.slug],
    );
    if (!row) return null;
    return { ...row, html: row.html_creative };
  });

export const getOfferCreatives = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ sponsorId: z.string().uuid(), offerId: z.string().min(1).max(64) }).parse,
  )
  .handler(async ({ data }) => {
    const sponsor = await dbFirst<{
      id: string; driver: string; api_base: string; api_key: string; affiliate_id: string;
    }>(
      "SELECT id, driver, api_base, api_key, affiliate_id FROM pipesend_sponsors WHERE id = ?",
      [data.sponsorId],
    );
    if (!sponsor) throw new Error("Sponsor introuvable");

    const cached = await dbFirst<{
      id: string; name: string | null; payout: number | null;
      payout_display: string | null; html_creative: string | null;
    }>(
      "SELECT id, name, payout, payout_display, html_creative FROM pipesend_sponsor_offers WHERE sponsor_id = ? AND offer_id = ?",
      [data.sponsorId, data.offerId],
    );

    let variants: Array<{
      creative_id: string | null;
      creative_name: string | null;
      creative_type: string | null;
      html: string | null;
      tracking_url: string | null;
    }> = [];
    let debug: string[] = [];

    if (sponsor.driver === "cake") {
      const row: SponsorRow = {
        id: sponsor.id,
        api_base: sponsor.api_base,
        api_key: sponsor.api_key,
        affiliate_id: sponsor.affiliate_id,
      };
      try {
        const r = await fetchOfferCreatives(row, data.offerId);
        variants = r.variants;
        debug = r.debug;
        if (variants.length === 0) {
          const r2 = await fetchOfferCreativesViaFeed(row, data.offerId);
          variants = r2.variants;
          debug = debug.concat(r2.debug);
        }
      } catch (e) {
        debug.push(e instanceof Error ? e.message : String(e));
      }
    }

    if (cached?.html_creative && !variants.some((v) => v.html === cached.html_creative)) {
      variants.unshift({
        creative_id: "cached",
        creative_name: "Cached (sync)",
        creative_type: "html",
        html: cached.html_creative,
        tracking_url: null,
      });
    }

    return {
      offer: cached
        ? {
            row_id: cached.id,
            name: cached.name,
            payout: Number(cached.payout ?? 0),
            payout_display: cached.payout_display,
          }
        : null,
      variants: variants.filter((v) => v.html),
      debug,
    };
  });
