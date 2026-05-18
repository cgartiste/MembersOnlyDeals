import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbQuery, dbFirst, dbRun, newId, nowIso } from "./db.server";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(100).regex(slugRe, "lowercase, digits, hyphens"),
  title: z.string().min(1).max(200),
  html: z.string().max(500_000).default(""),
  image_url: z.string().url().max(2000).optional().nullable(),
  offer_id: z.string().max(100).optional().nullable(),
  published: z.boolean().default(true),
});

export const listLandings = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; slug: string; title: string; image_url: string | null;
  offer_id: string | null; published: boolean; updated_at: string;
}>> => {
  const rows = await dbQuery<{
    id: string; slug: string; title: string; image_url: string | null;
    offer_id: string | null; published: number; updated_at: string;
  }>(
    "SELECT id, slug, title, image_url, offer_id, published, updated_at FROM pipesend_landings ORDER BY updated_at DESC",
  );
  return rows.map((r) => ({ ...r, published: !!r.published }));
});

export const getLanding = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }): Promise<null | {
    id: string; slug: string; title: string; html: string;
    image_url: string | null; offer_id: string | null; published: boolean; updated_at: string;
  }> => {
    const row = await dbFirst<{
      id: string; slug: string; title: string; html: string;
      image_url: string | null; offer_id: string | null; published: number; updated_at: string;
    }>("SELECT * FROM pipesend_landings WHERE id = ?", [data.id]);
    if (!row) return null;
    return { ...row, published: !!row.published };
  });

export const upsertLanding = createServerFn({ method: "POST" })
  .inputValidator(UpsertSchema.parse)
  .handler(async ({ data }) => {
    const id = data.id ?? newId();
    await dbRun(
      `INSERT INTO pipesend_landings (id, slug, title, html, image_url, offer_id, published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug, title = excluded.title, html = excluded.html,
         image_url = excluded.image_url, offer_id = excluded.offer_id,
         published = excluded.published, updated_at = excluded.updated_at`,
      [
        id, data.slug, data.title, data.html,
        data.image_url ?? null, data.offer_id ?? null,
        data.published ? 1 : 0, nowIso(),
      ],
    );
    return { id };
  });

export const deleteLanding = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    await dbRun("DELETE FROM pipesend_landings WHERE id = ?", [data.id]);
    return { ok: true };
  });

export const listPublicLandings = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; slug: string; title: string; image_url: string | null; updated_at: string;
}>> => {
  return dbQuery(
    "SELECT id, slug, title, image_url, updated_at FROM pipesend_landings WHERE published = 1 ORDER BY updated_at DESC LIMIT 60",
  );
});

export const getPublicLanding = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().min(1).max(100) }).parse)
  .handler(async ({ data }): Promise<null | {
    id: string; slug: string; title: string; html: string;
    image_url: string | null; updated_at: string;
  }> => {
    return dbFirst(
      "SELECT id, slug, title, html, image_url, updated_at FROM pipesend_landings WHERE slug = ? AND published = 1",
      [data.slug],
    );
  });
