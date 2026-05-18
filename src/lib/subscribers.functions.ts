import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbQuery, dbFirst, dbRun, dbBatch, newId, nowIso } from "./db.server";
import { mgPostForm, mgGet, DEFAULT_DOMAIN } from "./mailgun.server";

const SITE_URL =
  process.env.PUBLIC_SITE_URL ||
  process.env.VITE_PUBLIC_SITE_URL ||
  "https://global-server.net";

const FROM = `Newsletter <newsletter@${DEFAULT_DOMAIN}>`;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMg(to: string, subject: string, html: string) {
  try {
    await mgPostForm(`/${encodeURIComponent(DEFAULT_DOMAIN)}/messages`, {
      from: FROM,
      to: [to],
      subject,
      html,
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

async function getTemplate(key: string): Promise<{ subject: string; html: string } | null> {
  return dbFirst<{ subject: string; html: string }>(
    "SELECT subject, html FROM pipesend_email_templates WHERE key = ?",
    [key],
  );
}

function defaultConfirm(confirmUrl: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:32px auto;color:#1a1d2e">
  <h1 style="color:#7c5cff">Confirm your subscription</h1>
  <p>Thanks for your interest in our private deals. To complete your subscription, please click the button below:</p>
  <p style="margin:24px 0"><a href="${confirmUrl}" style="background:#7c5cff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirm my subscription</a></p>
  <p style="font-size:12px;color:#666">If you did not request this, simply ignore this message.</p>
  <p style="font-size:11px;color:#999">Link: <a href="${confirmUrl}">${confirmUrl}</a></p>
  </body></html>`;
}

function defaultWelcome() {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:32px auto;color:#1a1d2e">
  <h1 style="color:#7c5cff">Thank you for your trust</h1>
  <p>Your subscription is now confirmed. We're truly grateful to have you on board.</p>
  <p>You'll be the first to receive our upcoming private deals and exclusive offers, hand-picked just for our community.</p>
  <p style="margin-top:24px">Welcome aboard,<br/><strong>The Global Server Team</strong></p>
  <p style="font-size:12px;color:#666;margin-top:32px">To unsubscribe at any time, just reply "STOP" to this message.</p>
  </body></html>`;
}

async function renderConfirm(confirmUrl: string) {
  const tpl = await getTemplate("confirmation");
  if (!tpl) return { subject: "Confirm your newsletter subscription", html: defaultConfirm(confirmUrl) };
  return { subject: tpl.subject, html: tpl.html.replace(/\{\{confirm_url\}\}/g, confirmUrl) };
}

async function renderWelcome() {
  const tpl = await getTemplate("welcome");
  if (!tpl) return { subject: "Thank you for your trust", html: defaultWelcome() };
  return { subject: tpl.subject, html: tpl.html };
}

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().trim().email().max(255),
      motivation: z.string().trim().max(500).optional(),
      country: z.string().trim().max(64).optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      interest: z.string().trim().max(120).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();

    // Validate email via Mailgun before inserting
    try {
      const v = await mgGet<{ result: string; risk: string; is_disposable_address: boolean }>(
        `/v4/address/validate?address=${encodeURIComponent(email)}`,
      );
      if (v.result === "undeliverable") {
        return { ok: false as const, reason: "invalid_email" as const, suggestion: null };
      }
      if (v.is_disposable_address) {
        return { ok: false as const, reason: "disposable_email" as const, suggestion: null };
      }
    } catch {
      // If validation API fails, continue — don't block subscriptions
    }

    const existing = await dbFirst<{ id: string; status: string; token: string }>(
      "SELECT id, status, token FROM pipesend_subscribers WHERE email = ?",
      [email],
    );

    let token = existing?.token ?? randomToken();

    if (existing) {
      if (existing.status === "confirmed") return { ok: true, alreadyConfirmed: true };
      await dbRun(
        "UPDATE pipesend_subscribers SET motivation = ?, country = ?, gender = ?, interest = ?, updated_at = ? WHERE id = ?",
        [data.motivation ?? null, data.country ?? null, data.gender ?? null, data.interest ?? null, nowIso(), existing.id],
      );
    } else {
      try {
        await dbRun(
          "INSERT INTO pipesend_subscribers (id, email, token, status, source, motivation, country, gender, interest) VALUES (?, ?, ?, 'pending', 'public_form', ?, ?, ?, ?)",
          [newId(), email, token, data.motivation ?? null, data.country ?? null, data.gender ?? null, data.interest ?? null],
        );
      } catch {
        return { ok: true, alreadyConfirmed: false };
      }
    }

    const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${token}`;
    const tpl = await renderConfirm(confirmUrl);
    const sent = await sendMg(email, tpl.subject, tpl.html);
    return { ok: true, alreadyConfirmed: false, mail: sent };
  });

export const confirmSubscription = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(8).max(128) }).parse)
  .handler(async ({ data }) => {
    const sub = await dbFirst<{ id: string; email: string; status: string }>(
      "SELECT id, email, status FROM pipesend_subscribers WHERE token = ?",
      [data.token],
    );
    if (!sub) return { ok: false as const, reason: "invalid" };
    if (sub.status === "confirmed") return { ok: true as const, email: sub.email, already: true };
    await dbRun(
      "UPDATE pipesend_subscribers SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?",
      [nowIso(), nowIso(), sub.id],
    );
    const tpl = await renderWelcome();
    await sendMg(sub.email, tpl.subject, tpl.html);
    return { ok: true as const, email: sub.email, already: false };
  });

export const listSubscribers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      status: z.enum(["all", "pending", "confirmed", "unsubscribed"]).default("all"),
      gender: z.string().max(20).optional(),
      country: z.string().max(64).optional(),
      interest: z.string().max(120).optional(),
      search: z.string().max(120).optional(),
    }).parse,
  )
  .handler(async ({ data }): Promise<Array<{
    id: string; email: string; status: string; source: string | null;
    gender: string | null; country: string | null; interest: string | null;
    motivation: string | null; level: string | null;
    confirmed_at: string | null; created_at: string;
  }>> => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (data.status !== "all") { conditions.push("status = ?"); params.push(data.status); }
    if (data.gender) { conditions.push("gender = ?"); params.push(data.gender); }
    if (data.country) { conditions.push("country LIKE ?"); params.push(`%${data.country}%`); }
    if (data.interest) { conditions.push("interest LIKE ?"); params.push(`%${data.interest}%`); }
    if (data.search) { conditions.push("email LIKE ?"); params.push(`%${data.search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return dbQuery(
      `SELECT id, email, status, source, gender, country, interest, motivation, level, confirmed_at, created_at
       FROM pipesend_subscribers ${where} ORDER BY created_at DESC LIMIT 500`,
      params,
    );
  });

export const getSubscribersStats = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await dbQuery<{ status: string }>("SELECT status FROM pipesend_subscribers");
  const counts = { total: 0, pending: 0, confirmed: 0, unsubscribed: 0 };
  for (const r of rows) {
    counts.total++;
    if (r.status === "pending") counts.pending++;
    else if (r.status === "confirmed") counts.confirmed++;
    else if (r.status === "unsubscribed") counts.unsubscribed++;
  }
  return counts;
});

export const updateSubscriber = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      gender: z.string().max(20).nullable().optional(),
      country: z.string().max(64).nullable().optional(),
      interest: z.string().max(120).nullable().optional(),
      level: z.string().max(40).nullable().optional(),
      status: z.enum(["pending", "confirmed", "unsubscribed"]).optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const sets: string[] = ["updated_at = ?"];
    const params: unknown[] = [nowIso()];
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
    }
    params.push(id);
    await dbRun(`UPDATE pipesend_subscribers SET ${sets.join(", ")} WHERE id = ?`, params);
    return { ok: true };
  });

export const deleteSubscriber = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    await dbRun("DELETE FROM pipesend_subscribers WHERE id = ?", [data.id]);
    return { ok: true };
  });

export const importSubscribers = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ raw: z.string().min(1).max(2_000_000), sendConfirmation: z.boolean().default(true) }).parse,
  )
  .handler(async ({ data }) => {
    const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
    const matches = data.raw.match(emailRe) ?? [];
    const unique = Array.from(new Set(matches.map((e) => e.toLowerCase())));
    if (unique.length === 0) return { ok: true, imported: 0, skipped: 0, sent: 0 };

    let imported = 0;
    let skipped = 0;
    let sent = 0;

    for (const email of unique) {
      const existing = await dbFirst<{ id: string; status: string; token: string }>(
        "SELECT id, status, token FROM pipesend_subscribers WHERE email = ?",
        [email],
      );

      let token: string;
      if (existing) {
        if (existing.status === "confirmed") { skipped++; continue; }
        token = existing.token;
      } else {
        token = randomToken();
        try {
          await dbRun(
            "INSERT INTO pipesend_subscribers (id, email, token, status, source) VALUES (?, ?, ?, 'pending', 'csv_import')",
            [newId(), email, token],
          );
          imported++;
        } catch {
          skipped++;
          continue;
        }
      }

      if (data.sendConfirmation) {
        const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${token}`;
        const tpl = await renderConfirm(confirmUrl);
        const r = await sendMg(email, tpl.subject, tpl.html);
        if (r.ok) sent++;
      }
    }

    return { ok: true, imported, skipped, sent, total: unique.length };
  });
