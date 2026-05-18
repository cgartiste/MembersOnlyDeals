import { mgPostForm, DEFAULT_DOMAIN } from "./mailgun.server";

interface D1Like {
  prepare(sql: string): { bind(...p: unknown[]): { all<T>(): Promise<{ results: T[] }>; run(): Promise<unknown> } };
}

const SITE_URL = () =>
  process.env.PUBLIC_SITE_URL || "https://global-server.net";

const FROM = `Members Only Deals <newsletter@${DEFAULT_DOMAIN}>`;

type Relance = {
  col: string;
  key: string;
  minHours: number;
  label: string;
};

const RELANCES: Relance[] = [
  { col: "relance_1_sent_at", key: "relance_48h", minHours: 48,    label: "48h" },
  { col: "relance_2_sent_at", key: "relance_1w",  minHours: 168,   label: "1 semaine" },
  { col: "relance_3_sent_at", key: "relance_15d", minHours: 360,   label: "15 jours" },
  { col: "relance_4_sent_at", key: "relance_1m",  minHours: 720,   label: "1 mois" },
];

async function getTemplate(
  db: D1Like,
  key: string,
): Promise<{ subject: string; html: string } | null> {
  const result = await db
    .prepare("SELECT subject, html FROM pipesend_email_templates WHERE key = ?")
    .bind(key)
    .all<{ subject: string; html: string }>();
  return result.results[0] ?? null;
}

async function sendRelance(email: string, token: string, tpl: { subject: string; html: string }) {
  const confirmUrl = `${SITE_URL()}/newsletter/confirm?token=${token}`;
  const html = tpl.html.replace(/\{\{confirm_url\}\}/g, confirmUrl);
  try {
    await mgPostForm(`/${encodeURIComponent(DEFAULT_DOMAIN)}/messages`, {
      from: FROM,
      to: [email],
      subject: tpl.subject,
      html,
    });
    return true;
  } catch (e) {
    console.error(`[relance] Failed sending to ${email}:`, e);
    return false;
  }
}

export async function processRelances(db: D1Like): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;
  const now = Date.now();

  for (const relance of RELANCES) {
    const minMs = relance.minHours * 3_600_000;
    const cutoff = new Date(now - minMs).toISOString();

    // Pending subscribers old enough AND haven't received this relance yet
    const { results: subs } = await db
      .prepare(
        `SELECT id, email, token, created_at FROM pipesend_subscribers
         WHERE status = 'pending'
           AND created_at <= ?
           AND ${relance.col} IS NULL
         LIMIT 200`,
      )
      .bind(cutoff)
      .all<{ id: string; email: string; token: string; created_at: string }>();

    if (subs.length === 0) continue;

    const tpl = await getTemplate(db, relance.key);
    if (!tpl) {
      console.warn(`[relance] Template "${relance.key}" not found, skipping`);
      continue;
    }

    console.log(`[relance] ${relance.label}: sending to ${subs.length} subscribers`);

    for (const sub of subs) {
      const ok = await sendRelance(sub.email, sub.token, tpl);
      if (ok) {
        await db
          .prepare(`UPDATE pipesend_subscribers SET ${relance.col} = ? WHERE id = ?`)
          .bind(new Date().toISOString(), sub.id)
          .run();
        sent++;
      } else {
        errors++;
      }
    }
  }

  return { sent, errors };
}
