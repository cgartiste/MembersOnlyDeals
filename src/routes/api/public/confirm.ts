import { createFileRoute } from "@tanstack/react-router";
import { dbFirst, dbRun, newId } from "@/lib/db.server";

function isValidUrl(u: string) {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        let token = url.searchParams.get("token");

        if (!token) {
          const raw = url.search.replace(/^\?/, "");
          for (const part of raw.split("&")) {
            const decoded = decodeURIComponent(part);
            const m = decoded.match(/^token=(.+)$/i);
            if (m) { token = m[1]; break; }
          }
        }

        if (!token) return new Response("Missing token", { status: 400 });

        const sub = await dbFirst<{ id: string; email: string; current_sell_link: string | null }>(
          "SELECT id, email, current_sell_link FROM pipesend_subscribers WHERE token = ?",
          [token],
        );

        const to = sub?.current_sell_link ?? null;
        if (!sub || !to || !isValidUrl(to)) {
          return new Response("Lien expiré ou invalide", { status: 404 });
        }

        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || null;
        const ua = request.headers.get("user-agent") || null;

        try {
          await dbRun(
            "INSERT INTO pipesend_email_clicks (id, token, subscriber_id, email, sell_link, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [newId(), token, sub.id, sub.email, to, ip, ua],
          );
        } catch (e) {
          console.warn("[confirm] click log failed:", e);
        }

        return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store" } });
      },
    },
  },
});
