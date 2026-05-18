import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { dbFirst, dbQuery, dbRun, newId } from "./db.server";
import { fetchOfferCreatives, fetchOfferCreativesViaFeed, type SponsorRow } from "./cake.server";
import { mgPostForm, mgPutForm, DEFAULT_DOMAIN } from "./mailgun.server";

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
        ? { row_id: cached.id, name: cached.name, payout: Number(cached.payout ?? 0), payout_display: cached.payout_display }
        : null,
      variants: variants.filter((v) => v.html),
      debug,
    };
  });

const audienceSchema = z.object({
  status: z.enum(["confirmed", "pending", "unsubscribed", "all"]).default("confirmed"),
  gender: z.string().max(20).optional(),
  country: z.string().max(64).optional(),
  interest: z.string().max(120).optional(),
  level: z.string().max(40).optional(),
});

async function selectAudience(filters: z.infer<typeof audienceSchema>) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status !== "all") { conditions.push("status = ?"); params.push(filters.status); }
  if (filters.gender) { conditions.push("gender = ?"); params.push(filters.gender); }
  if (filters.country) { conditions.push("country LIKE ?"); params.push(`%${filters.country}%`); }
  if (filters.interest) { conditions.push("interest LIKE ?"); params.push(`%${filters.interest}%`); }
  if (filters.level) { conditions.push("level = ?"); params.push(filters.level); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await dbQuery<{ email: string; token: string | null }>(
    `SELECT email, token FROM pipesend_subscribers ${where} LIMIT 10000`,
    params,
  );

  const seen = new Set<string>();
  const out: Array<{ email: string; token: string | null }> = [];
  for (const r of rows) {
    const email = r.email.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ email, token: r.token ?? null });
  }
  return out;
}

export const previewAudience = createServerFn({ method: "POST" })
  .inputValidator(audienceSchema.parse)
  .handler(async ({ data }) => {
    const recipients = await selectAudience(data);
    return { count: recipients.length, sample: recipients.slice(0, 10).map((r) => r.email) };
  });

const campaignSchema = z.object({
  sponsorRowId: z.string().uuid().optional(),
  fromName: z.string().min(1).max(120).default("PipeSend"),
  fromEmail: z.string().email().max(255),
  subject: z.string().min(1).max(255),
  html: z.string().min(1).max(500_000),
  domain: z.string().min(3).max(255).default(DEFAULT_DOMAIN),
  audience: audienceSchema,
  deliveryTime: z.string().max(64).optional(),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  testEmail: z.string().max(2000).optional().transform((v) => {
    if (!v) return undefined;
    const list = v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = list.filter((e) => re.test(e));
    return valid.length > 0 ? valid : undefined;
  }),
  sellLink: z.string().url().max(2000).optional(),
});

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export const sendMailingCampaign = createServerFn({ method: "POST" })
  .inputValidator(campaignSchema.parse)
  .handler(async ({ data }) => {
    const recipients = data.testEmail
      ? data.testEmail.map((email) => ({ email, token: "test" }))
      : await selectAudience(data.audience);
    if (recipients.length === 0) throw new Error("Aucun destinataire ne correspond à ces filtres.");

    let sponsorId: string | null = null;
    let offerId: string | null = null;
    let offerName: string | null = null;
    let payout = 0;
    if (data.sponsorRowId) {
      const off = await dbFirst<{ sponsor_id: string; offer_id: string; name: string | null; payout: number | null }>(
        "SELECT sponsor_id, offer_id, name, payout FROM pipesend_sponsor_offers WHERE id = ?",
        [data.sponsorRowId],
      );
      if (off) {
        sponsorId = off.sponsor_id;
        offerId = off.offer_id;
        offerName = off.name;
        payout = Number(off.payout ?? 0);
      }
    }

    const from = `${data.fromName} <${data.fromEmail}>`;
    const batches = chunk(recipients, 900);
    let totalSent = 0;
    const ids: string[] = [];
    const errors: string[] = [];

    const rawSiteUrl = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "https://global-server.net";
    const SITE_URL = /^https?:\/\//i.test(rawSiteUrl)
      ? rawSiteUrl.replace(/^http:\/\//i, "https://").replace(/\/+$/, "")
      : `https://${rawSiteUrl.replace(/^\/+/, "").replace(/\/+$/, "")}`;
    const SITE_ADDRESS = "Affilix Club — 1 rue de Test, 75000 Paris, France";
    const unsubBase = `${SITE_URL}/api/public/unsubscribe`;
    const unsubUrlVar = `${unsubBase}?token=%recipient.token%`;
    const unsubMailto = `mailto:unsubscribe@${data.domain}?subject=unsubscribe`;

    const footerHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;border-top:1px solid #eee;padding-top:16px">
  <tr><td style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;color:#888;text-align:center;line-height:1.6">
    Vous recevez cet email car vous êtes inscrit à Affilix.club.<br>
    <a href="${unsubUrlVar}" style="color:#888;text-decoration:underline">Se désinscrire en un clic</a><br>
    ${SITE_ADDRESS}
  </td></tr>
</table>`;
    const htmlWithFooter = /<\/body>/i.test(data.html)
      ? data.html.replace(/<\/body>/i, `${footerHtml}</body>`)
      : `${data.html}${footerHtml}`;

    const personalize = (html: string) =>
      html
        .replace(/\{\{\s*token\s*\}\}/gi, "%recipient.token%")
        .replace(/\{\{\s*email\s*\}\}/gi, "%recipient.email%")
        .replace(/\{\{\s*sell_link\s*\}\}/gi, data.sellLink ? `${SITE_URL}/api/public/confirm?token=%recipient.token%` : "#");
    const finalHtml = personalize(htmlWithFooter);
    const finalSubject = personalize(data.subject);

    if (data.trackClicks) {
      try { await mgPutForm(`/v3/domains/${encodeURIComponent(data.domain)}`, { web_scheme: "https" }); }
      catch (e) { console.warn("Mailgun web_scheme=https update failed:", e); }
    }

    if (data.sellLink) {
      if (data.testEmail) {
        await dbRun(
          "INSERT INTO pipesend_subscribers (id, email, token, current_sell_link, status) VALUES (?, 'test@global-server.net', 'test', ?, 'confirmed') ON CONFLICT(token) DO UPDATE SET current_sell_link = excluded.current_sell_link",
          [newId(), data.sellLink],
        );
      } else {
        const tokens = recipients.map((r) => r.token).filter((t): t is string => !!t && t !== "test");
        const CHUNK = 100;
        for (let i = 0; i < tokens.length; i += CHUNK) {
          const slice = tokens.slice(i, i + CHUNK);
          const placeholders = slice.map(() => "?").join(",");
          await dbRun(
            `UPDATE pipesend_subscribers SET current_sell_link = ? WHERE token IN (${placeholders})`,
            [data.sellLink, ...slice],
          );
        }
      }
    }

    for (const batch of batches) {
      const recipientVariables: Record<string, { email: string; token: string }> = {};
      for (const r of batch) recipientVariables[r.email] = { email: r.email, token: r.token ?? "" };

      const form: Record<string, string | string[]> = {
        from,
        to: batch.map((r) => r.email),
        subject: finalSubject,
        html: finalHtml,
        "recipient-variables": JSON.stringify(recipientVariables),
        "o:tracking-opens": data.trackOpens ? "yes" : "no",
        "o:tracking-clicks": data.trackClicks ? "yes" : "no",
        "h:List-Unsubscribe": `<${unsubUrlVar}>, <${unsubMailto}>`,
        "h:List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
      if (data.deliveryTime) form["o:deliverytime"] = data.deliveryTime;

      try {
        const res = await mgPostForm<{ id: string }>(`/${encodeURIComponent(data.domain)}/messages`, form);
        ids.push(res.id);
        totalSent += batch.length;
        await dbRun(
          "INSERT INTO pipesend_email_sends (id, sponsor_id, offer_id, offer_name, payout, recipient_count, estimated_revenue, subject, from_email, mailgun_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')",
          [newId(), sponsorId, offerId, offerName, payout, batch.length, payout * batch.length * 0.01, data.subject, data.fromEmail, res.id],
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        errors.push(err);
        await dbRun(
          "INSERT INTO pipesend_email_sends (id, sponsor_id, offer_id, offer_name, payout, recipient_count, subject, from_email, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)",
          [newId(), sponsorId, offerId, offerName, payout, batch.length, data.subject, data.fromEmail, err],
        );
      }
    }

    return { ok: errors.length === 0, totalSent, batches: batches.length, ids, errors, scheduled: Boolean(data.deliveryTime) };
  });
