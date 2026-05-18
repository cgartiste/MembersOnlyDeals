import { createFileRoute } from "@tanstack/react-router";
import { dbFirst, dbRun, nowIso } from "@/lib/db.server";

async function unsubscribeByToken(token: string | null) {
  if (!token) return false;
  const sub = await dbFirst<{ id: string }>(
    "SELECT id FROM pipesend_subscribers WHERE token = ?",
    [token],
  );
  if (!sub) return false;
  await dbRun(
    "UPDATE pipesend_subscribers SET status = 'unsubscribed', updated_at = ? WHERE id = ?",
    [nowIso(), sub.id],
  );
  return true;
}

function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:80px auto;color:#111;padding:0 20px;text-align:center}h1{color:#ef3b48}</style>
</head><body><h1>${title}</h1>${body}<p style="margin-top:32px;font-size:12px;color:#888">Affilix.club</p></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ok = await unsubscribeByToken(url.searchParams.get("token"));
        return ok
          ? page("Désinscription confirmée", "<p>Vous ne recevrez plus nos emails.</p>")
          : page("Lien invalide", "<p>Ce lien de désinscription n'est plus valide.</p>");
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let token = url.searchParams.get("token");
        if (!token) {
          try {
            const form = await request.formData();
            token = (form.get("token") as string | null) ?? null;
          } catch { /* noop */ }
        }
        await unsubscribeByToken(token);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
