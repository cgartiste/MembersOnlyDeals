import { createFileRoute } from "@tanstack/react-router";
import { dbFirst } from "@/lib/db.server";
import { z } from "zod";

const BodySchema = z.object({
  sponsor_id: z.string().uuid(),
  offer_id: z.string().min(1).max(50),
  name: z.string().max(120).optional().default(""),
  phone: z.string().min(3).max(40),
  country_code: z.string().length(2),
  price: z.union([z.number(), z.string()]),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  quantity: z.number().int().min(1).max(100).optional(),
  ext_in_id: z.string().max(120).optional(),
  subacc: z.string().max(120).optional(),
  subacc2: z.string().max(120).optional(),
  subacc3: z.string().max(120).optional(),
  subacc4: z.string().max(120).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
  base_url: z.string().max(500).optional(),
});

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "0.0.0.0";
}

export const Route = createFileRoute("/api/public/adcombo/order")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
        let body: unknown;
        try { body = await request.json(); }
        catch { return new Response(JSON.stringify({ code: "error", error: "Invalid JSON" }), { status: 400, headers: cors }); }

        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ code: "error", error: parsed.error.flatten() }), { status: 400, headers: cors });
        }
        const data = parsed.data;

        const sponsor = await dbFirst<{ driver: string; api_base: string; api_key: string }>(
          "SELECT driver, api_base, api_key FROM pipesend_sponsors WHERE id = ?",
          [data.sponsor_id],
        );
        if (!sponsor) return new Response(JSON.stringify({ code: "error", error: "Sponsor introuvable" }), { status: 404, headers: cors });
        if (sponsor.driver !== "adcombo") return new Response(JSON.stringify({ code: "error", error: "Sponsor non-AdCombo" }), { status: 400, headers: cors });

        const ip = getClientIp(request);
        const params = new URLSearchParams({
          api_key: sponsor.api_key,
          offer_id: data.offer_id,
          name: data.name ?? "",
          phone: data.phone,
          country_code: data.country_code.toUpperCase(),
          price: String(data.price),
          ip,
        });
        const optional: Array<[string, string | undefined]> = [
          ["email", data.email], ["address", data.address],
          ["quantity", data.quantity != null ? String(data.quantity) : undefined],
          ["ext_in_id", data.ext_in_id], ["subacc", data.subacc], ["subacc2", data.subacc2],
          ["subacc3", data.subacc3], ["subacc4", data.subacc4],
          ["utm_source", data.utm_source], ["utm_medium", data.utm_medium],
          ["utm_campaign", data.utm_campaign], ["utm_content", data.utm_content],
          ["utm_term", data.utm_term], ["referrer", data.referrer], ["base_url", data.base_url],
        ];
        for (const [k, v] of optional) { if (v != null && v !== "") params.set(k, v); }

        const url = `${sponsor.api_base.replace(/\/+$/, "")}/api/v2/order/create/?${params.toString()}`;
        try {
          const upstream = await fetch(url, { method: "GET" });
          const text = await upstream.text();
          let json: unknown;
          try { json = JSON.parse(text); }
          catch { json = { code: "error", error: "Réponse AdCombo non-JSON", raw: text }; }
          return new Response(JSON.stringify(json), { status: upstream.ok ? 200 : 502, headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ code: "error", error: `Échec AdCombo: ${(e as Error).message}` }), { status: 502, headers: cors });
        }
      },
    },
  },
});
