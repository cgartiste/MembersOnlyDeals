import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { dbFirst, dbQuery, dbRun, newId, nowIso, getDb } from "./db.server";
import { mgGet, mgPostForm, DEFAULT_DOMAIN } from "./mailgun.server";

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      domain: z.string().min(3).max(255).default(DEFAULT_DOMAIN),
      from: z.string().min(3).max(255),
      to: z.string().min(3).max(2000),
      subject: z.string().min(1).max(255),
      html: z.string().min(1).max(200_000),
      text: z.string().max(200_000).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const recipients = data.to.split(",").map((x) => x.trim()).filter(Boolean);
    try {
      const res = await mgPostForm<{ id: string; message: string }>(
        `/${encodeURIComponent(data.domain)}/messages`,
        {
          from: data.from,
          to: recipients,
          subject: data.subject,
          html: data.html,
          ...(data.text ? { text: data.text } : {}),
        },
      );
      await dbRun(
        "INSERT INTO pipesend_email_sends (id, recipient_count, subject, from_email, mailgun_id, status) VALUES (?, ?, ?, ?, ?, 'sent')",
        [newId(), recipients.length, data.subject, data.from, res.id],
      );
      return { ok: true, id: res.id, message: res.message, recipients: recipients.length };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await dbRun(
        "INSERT INTO pipesend_email_sends (id, recipient_count, subject, from_email, status, error) VALUES (?, ?, ?, ?, 'failed', ?)",
        [newId(), recipients.length, data.subject, data.from, err],
      );
      throw new Error(err);
    }
  });

export const sendSponsorOffer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      offerRowId: z.string().uuid(),
      from: z.string().min(3).max(255),
      to: z.string().min(3).max(5000),
      subject: z.string().min(1).max(255).optional(),
      domain: z.string().min(3).max(255).default(DEFAULT_DOMAIN),
    }).parse,
  )
  .handler(async ({ data }) => {
    const offer = await dbFirst<{
      id: string; sponsor_id: string; offer_id: string; name: string | null;
      payout: number | null; html_creative: string | null;
    }>(
      "SELECT id, sponsor_id, offer_id, name, payout, html_creative FROM pipesend_sponsor_offers WHERE id = ?",
      [data.offerRowId],
    );
    if (!offer) throw new Error("Offre introuvable");
    if (!offer.html_creative) throw new Error("Cette offre n'a pas de creative HTML");

    const recipients = data.to.split(",").map((x) => x.trim()).filter(Boolean);
    const subject = data.subject ?? offer.name ?? "Nouvelle offre";
    const payout = Number(offer.payout ?? 0);

    try {
      const res = await mgPostForm<{ id: string }>(
        `/${encodeURIComponent(data.domain)}/messages`,
        { from: data.from, to: recipients, subject, html: offer.html_creative },
      );
      await dbRun(
        "INSERT INTO pipesend_email_sends (id, sponsor_id, offer_id, offer_name, payout, recipient_count, estimated_revenue, subject, from_email, mailgun_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')",
        [newId(), offer.sponsor_id, offer.offer_id, offer.name, payout, recipients.length, payout * recipients.length * 0.01, subject, data.from, res.id],
      );
      return { ok: true, id: res.id, recipients: recipients.length };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await dbRun(
        "INSERT INTO pipesend_email_sends (id, sponsor_id, offer_id, offer_name, payout, recipient_count, subject, from_email, status, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)",
        [newId(), offer.sponsor_id, offer.offer_id, offer.name, payout, recipients.length, subject, data.from, err],
      );
      throw new Error(err);
    }
  });

type MgDomainsResp = {
  items: Array<{ name: string; state: string; created_at: string; type?: string }>;
  total_count: number;
};

export const listMailgunDomains = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await mgGet<MgDomainsResp>("/v4/domains?limit=20");
    return { ok: true as const, items: res.items ?? [] };
  } catch (e) {
    return { ok: false as const, items: [], error: e instanceof Error ? e.message : String(e) };
  }
});

type MgStatsResp = {
  stats: Array<{
    time: string;
    accepted?: { total: number };
    delivered?: { total: number };
    failed?: { permanent?: { total: number }; temporary?: { total: number } };
    opened?: { total: number };
    clicked?: { total: number };
  }>;
};

export const getMailgunStats = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ domain: z.string().min(3).max(255).default(DEFAULT_DOMAIN), days: z.number().int().min(1).max(90).default(7) }).parse,
  )
  .handler(async ({ data }) => {
    const events = ["accepted", "delivered", "failed", "opened", "clicked"].map((e) => `event=${e}`).join("&");
    const totals = { accepted: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };
    const paths = [
      `/v3/${encodeURIComponent(data.domain)}/stats/total?${events}&duration=${data.days}d`,
      `/v3/stats/total?${events}&duration=${data.days}d`,
    ];
    let lastError: string | null = null;
    let scope: "domain" | "account" = "domain";
    for (let i = 0; i < paths.length; i++) {
      try {
        const res = await mgGet<MgStatsResp>(paths[i]);
        for (const row of res.stats ?? []) {
          totals.accepted += row.accepted?.total ?? 0;
          totals.delivered += row.delivered?.total ?? 0;
          totals.failed += (row.failed?.permanent?.total ?? 0) + (row.failed?.temporary?.total ?? 0);
          totals.opened += row.opened?.total ?? 0;
          totals.clicked += row.clicked?.total ?? 0;
        }
        scope = i === 0 ? "domain" : "account";
        return { ok: true as const, totals, days: data.days, domain: data.domain, scope };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (i === 0 && !/\[404\]/.test(lastError)) break;
      }
    }
    return { ok: false as const, totals, days: data.days, domain: data.domain, scope, error: lastError ?? "Mailgun stats indisponibles" };
  });

export const getMonthlyIncome = createServerFn({ method: "GET" }).handler(async () => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const rows = await dbQuery<{ estimated_revenue: number | null; recipient_count: number | null }>(
    "SELECT estimated_revenue, recipient_count FROM pipesend_email_sends WHERE created_at >= ? AND status = 'sent'",
    [monthStart],
  );
  let revenue = 0;
  let sends = 0;
  let recipients = 0;
  for (const row of rows) {
    revenue += Number(row.estimated_revenue ?? 0);
    sends++;
    recipients += row.recipient_count ?? 0;
  }
  return { revenue, sends, recipients };
});

export const getRecentSends = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; sponsor_id: string | null; offer_name: string | null; payout: number | null;
  recipient_count: number | null; estimated_revenue: number | null; subject: string | null;
  from_email: string | null; mailgun_id: string | null; status: string | null;
  error: string | null; created_at: string;
}>> => {
  return dbQuery(
    "SELECT id, sponsor_id, offer_name, payout, recipient_count, estimated_revenue, subject, from_email, mailgun_id, status, error, created_at FROM pipesend_email_sends ORDER BY created_at DESC LIMIT 50",
  );
});

type MgSubscription = {
  plan?: { name?: string; display_name?: string };
  monthly_email_volume_limit?: number;
  current_period_emails_sent?: number;
  status?: string;
};

export const getMailgunAccountInfo = createServerFn({ method: "GET" }).handler(async () => {
  const candidates = ["/v5/accounts/subscription", "/v5/accounts/limit", "/v3/accounts/subscription"];
  for (const path of candidates) {
    try {
      const res = await mgGet<MgSubscription>(path);
      return {
        ok: true as const,
        plan: res.plan?.display_name ?? res.plan?.name ?? null,
        status: res.status ?? null,
        monthlyLimit: res.monthly_email_volume_limit ?? null,
        sentThisPeriod: res.current_period_emails_sent ?? null,
      };
    } catch { /* try next */ }
  }
  return { ok: false as const, plan: null, status: null, monthlyLimit: null, sentThisPeriod: null, error: "Quota Mailgun indisponible" };
});

export const listEmailTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; key: string; name: string; subject: string; html: string; updated_at: string;
}>> => {
  return dbQuery("SELECT id, key, name, subject, html, updated_at FROM pipesend_email_templates ORDER BY key ASC");
});

export const upsertEmailTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      key: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
      name: z.string().min(1).max(120),
      subject: z.string().min(1).max(255),
      html: z.string().min(1).max(500_000),
    }).parse,
  )
  .handler(async ({ data }) => {
    await dbRun(
      `INSERT INTO pipesend_email_templates (id, key, name, subject, html, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET name = excluded.name, subject = excluded.subject, html = excluded.html, updated_at = excluded.updated_at`,
      [newId(), data.key, data.name, data.subject, data.html, nowIso()],
    );
    return { ok: true };
  });

/* ── Email validation ── */
export const validateEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email() }).parse)
  .handler(async ({ data }) => {
    try {
      const res = await mgGet<{
        result: string; risk: string; is_disposable_address: boolean;
        did_you_mean?: string;
      }>(`/v4/address/validate?address=${encodeURIComponent(data.email)}`);
      return {
        valid: res.result !== "undeliverable" && res.risk !== "high",
        result: res.result,
        risk: res.risk,
        isDisposable: res.is_disposable_address,
        suggestion: res.did_you_mean ?? null,
      };
    } catch {
      return { valid: true, result: "unknown", risk: "unknown", isDisposable: false, suggestion: null };
    }
  });

/* ── Events log ── */
export const getEmailEvents = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventType: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse,
  )
  .handler(async ({ data }): Promise<Array<{
    id: string; event_type: string; recipient: string | null; mailgun_message_id: string | null;
    timestamp: number | null; ip: string | null; country: string | null;
    url: string | null; error_code: string | null; error_message: string | null; created_at: string;
  }>> => {
    const where = data.eventType ? "WHERE event_type = ?" : "";
    const params: unknown[] = data.eventType ? [data.eventType, data.limit] : [data.limit];
    return dbQuery(
      `SELECT id, event_type, recipient, mailgun_message_id, timestamp, ip, country,
              url, error_code, error_message, created_at
       FROM pipesend_email_events ${where} ORDER BY created_at DESC LIMIT ?`,
      params,
    );
  });

/* ── Events summary ── */
export const getEventsSummary = createServerFn({ method: "POST" })
  .inputValidator(z.object({ days: z.number().int().min(1).max(90).default(7) }).parse)
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const rows = await dbQuery<{ event_type: string; cnt: number }>(
      "SELECT event_type, COUNT(*) as cnt FROM pipesend_email_events WHERE created_at >= ? GROUP BY event_type",
      [since],
    );
    const summary: Record<string, number> = {};
    for (const r of rows) summary[r.event_type] = r.cnt;
    return {
      delivered: summary.delivered ?? 0,
      opened: summary.opened ?? 0,
      clicked: summary.clicked ?? 0,
      bounced: summary.bounced ?? 0,
      complained: summary.complained ?? 0,
      unsubscribed: summary.unsubscribed ?? 0,
      failed: summary.failed ?? 0,
    };
  });
