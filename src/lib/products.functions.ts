import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbQuery, dbFirst, dbRun, newId, nowIso } from "./db.server";

const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(100).regex(slugRe, "lowercase, digits, hyphens"),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  price: z.string().max(50).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable(),
  html: z.string().max(500_000).default(""),
  published: z.boolean().default(true),
});

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; slug: string; title: string; description: string | null;
  price: string | null; image_url: string | null; published: boolean; updated_at: string;
}>> => {
  const rows = await dbQuery<{
    id: string; slug: string; title: string; description: string | null;
    price: string | null; image_url: string | null; published: number; updated_at: string;
  }>(
    "SELECT id, slug, title, description, price, image_url, published, updated_at FROM pipesend_products ORDER BY updated_at DESC",
  );
  return rows.map((r) => ({ ...r, published: !!r.published }));
});

export const getProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }): Promise<null | {
    id: string; slug: string; title: string; description: string | null;
    price: string | null; image_url: string | null; html: string;
    email_html: string | null; published: boolean;
  }> => {
    const row = await dbFirst<{
      id: string; slug: string; title: string; description: string | null;
      price: string | null; image_url: string | null; html: string;
      email_html: string | null; published: number;
    }>("SELECT * FROM pipesend_products WHERE id = ?", [data.id]);
    if (!row) return null;
    return { ...row, published: !!row.published };
  });

export const saveProductEmailHtml = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      email_html: z.string().max(500_000),
      sell_link: z.string().url().max(2000).optional().nullable(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sets = ["email_html = ?", "updated_at = ?"];
    const params: unknown[] = [data.email_html, nowIso()];
    if (data.sell_link !== undefined) {
      sets.push("sell_link = ?");
      params.push(data.sell_link);
    }
    params.push(data.id);
    await dbRun(`UPDATE pipesend_products SET ${sets.join(", ")} WHERE id = ?`, params);
    return { ok: true };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator(UpsertSchema.parse)
  .handler(async ({ data }) => {
    const id = data.id ?? newId();
    await dbRun(
      `INSERT INTO pipesend_products (id, slug, title, description, price, image_url, html, published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug, title = excluded.title, description = excluded.description,
         price = excluded.price, image_url = excluded.image_url, html = excluded.html,
         published = excluded.published, updated_at = excluded.updated_at`,
      [
        id, data.slug, data.title, data.description ?? null, data.price ?? null,
        data.image_url ?? null, data.html, data.published ? 1 : 0, nowIso(),
      ],
    );
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    await dbRun("DELETE FROM pipesend_products WHERE id = ?", [data.id]);
    return { ok: true };
  });

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Array<{
  id: string; slug: string; title: string; description: string | null;
  price: string | null; image_url: string | null; updated_at: string;
}>> => {
  return dbQuery(
    "SELECT id, slug, title, description, price, image_url, updated_at FROM pipesend_products WHERE published = 1 ORDER BY updated_at DESC LIMIT 60",
  );
});

export const getPublicProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().min(1).max(100) }).parse)
  .handler(async ({ data }): Promise<null | {
    id: string; slug: string; title: string; description: string | null;
    price: string | null; image_url: string | null; html: string; updated_at: string;
  }> => {
    return dbFirst(
      "SELECT id, slug, title, description, price, image_url, html, updated_at FROM pipesend_products WHERE slug = ? AND published = 1",
      [data.slug],
    );
  });
