import { createFileRoute } from "@tanstack/react-router";
import { getDb, newId } from "@/lib/db.server";

async function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const data = new TextEncoder().encode(timestamp + token);
    const sig = await crypto.subtle.sign("HMAC", key, data);
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === signature;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/webhooks/mailgun")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signingKey = process.env.MAILGUN_WEBHOOK_KEY;
        if (!signingKey) {
          console.error("[webhook] MAILGUN_WEBHOOK_KEY not configured");
          return new Response("Webhook key not configured", { status: 500 });
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Verify signature
        const sig = body.signature as Record<string, string> | undefined;
        if (!sig?.timestamp || !sig?.token || !sig?.signature) {
          return new Response("Missing signature", { status: 401 });
        }
        const valid = await verifyMailgunSignature(
          sig.timestamp, sig.token, sig.signature, signingKey,
        );
        if (!valid) {
          console.warn("[webhook] Invalid Mailgun signature");
          return new Response("Invalid signature", { status: 401 });
        }

        const eventData = body["event-data"] as Record<string, unknown> | undefined;
        if (!eventData) return new Response("No event data", { status: 400 });

        const eventType = String(eventData.event ?? "unknown");
        const recipient = String(eventData.recipient ?? "");
        const timestamp = Number(eventData.timestamp ?? 0);
        const ip = (eventData["ip"] ?? eventData["client-info"] as Record<string,unknown>)?.toString?.() ?? null;
        const clientInfo = eventData["client-info"] as Record<string, unknown> | undefined;
        const geoLocation = eventData["geolocation"] as Record<string, unknown> | undefined;
        const country = String(geoLocation?.country ?? "");
        const msgHeaders = (eventData.message as Record<string,unknown>)?.headers as Record<string,unknown> | undefined;
        const mailgunId = String(msgHeaders?.["message-id"] ?? eventData.id ?? "");
        const url = String((eventData.url as string) ?? "");

        // Delivery failure info
        const deliveryStatus = eventData["delivery-status"] as Record<string, unknown> | undefined;
        const errorCode = String(deliveryStatus?.code ?? deliveryStatus?.["enhanced-code"] ?? "");
        const errorMessage = String(deliveryStatus?.message ?? deliveryStatus?.description ?? "");

        const db = getDb();

        // Store event
        try {
          await db.prepare(
            `INSERT INTO pipesend_email_events
             (id, event_type, recipient, mailgun_message_id, timestamp, ip, country, url, error_code, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            newId(), eventType, recipient, mailgunId || null, timestamp || null,
            ip || null, country || null, url || null, errorCode || null, errorMessage || null,
          ).run();
        } catch (e) {
          console.error("[webhook] Failed to store event:", e);
        }

        const now = new Date().toISOString();

        // Auto-actions based on event type
        if (eventType === "bounced" || (eventType === "failed" && errorCode)) {
          // Mark subscriber as bounced — hard bounces only
          await db.prepare(
            "UPDATE pipesend_subscribers SET status = 'bounced', bounced_at = ? WHERE email = ? AND status != 'unsubscribed'",
          ).bind(now, recipient.toLowerCase()).run();
          console.log(`[webhook] Bounce → marked ${recipient} as bounced`);
        }

        if (eventType === "complained") {
          // Spam complaint → immediately unsubscribe
          await db.prepare(
            "UPDATE pipesend_subscribers SET status = 'unsubscribed', complained_at = ?, updated_at = ? WHERE email = ?",
          ).bind(now, now, recipient.toLowerCase()).run();
          console.log(`[webhook] Complaint → unsubscribed ${recipient}`);
        }

        if (eventType === "unsubscribed") {
          // Mailgun-side unsubscribe event
          await db.prepare(
            "UPDATE pipesend_subscribers SET status = 'unsubscribed', updated_at = ? WHERE email = ? AND status != 'unsubscribed'",
          ).bind(now, recipient.toLowerCase()).run();
        }

        console.log(`[webhook] ${eventType} → ${recipient}`);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
