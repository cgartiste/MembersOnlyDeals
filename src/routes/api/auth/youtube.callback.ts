import { createFileRoute } from "@tanstack/react-router";
import { dbFirst, dbRun, nowIso } from "@/lib/db.server";

export const Route = createFileRoute("/api/auth/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error || !code) {
          return new Response(null, { status: 302, headers: { Location: "/onboarding?error=access_denied" } });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID!;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
        const appUrl = process.env.VITE_APP_URL ?? "http://localhost:8080";
        const redirectUri = `${appUrl}/api/auth/youtube/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
        });

        if (!tokenRes.ok) {
          const err = await tokenRes.text();
          console.error("[youtube-callback] Token exchange failed:", err);
          return new Response(null, { status: 302, headers: { Location: "/onboarding?error=token_failed" } });
        }

        const tokens = await tokenRes.json() as {
          access_token: string; refresh_token?: string; expires_in: number;
        };

        // Get YouTube channel info
        const channelRes = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        );
        const channelJson = await channelRes.json() as { items?: Array<Record<string, unknown>> };
        const channel = channelJson.items?.[0];

        if (!channel) {
          return new Response(null, { status: 302, headers: { Location: "/onboarding?error=no_channel" } });
        }

        const snippet = channel.snippet as Record<string, unknown>;
        const stats = channel.statistics as Record<string, unknown>;
        const thumbs = snippet.thumbnails as Record<string, Record<string, string>>;
        const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // We need the creator session — it's passed via a cookie or state param
        // For now, find the most recently created creator without youtube_channel_id
        // In production, encode creator_id in the OAuth state param
        const stateParam = url.searchParams.get("state") ?? "";
        let creatorId: string | null = null;

        // Extract creator_id from state if encoded
        if (stateParam.includes(":")) {
          creatorId = stateParam.split(":")[1];
        }

        // Fallback: find by channel id (re-connecting)
        if (!creatorId) {
          const existing = await dbFirst<{ id: string }>(
            "SELECT id FROM tubemind_creators WHERE youtube_channel_id = ? LIMIT 1",
            [channel.id as string],
          );
          creatorId = existing?.id ?? null;
        }

        // Last fallback: most recently created without youtube
        if (!creatorId) {
          const recent = await dbFirst<{ id: string }>(
            "SELECT id FROM tubemind_creators WHERE youtube_channel_id IS NULL ORDER BY created_at DESC LIMIT 1",
          );
          creatorId = recent?.id ?? null;
        }

        if (!creatorId) {
          return new Response(null, { status: 302, headers: { Location: "/creator-login?error=session_lost" } });
        }

        await dbRun(
          `UPDATE tubemind_creators SET
            youtube_channel_id = ?, youtube_channel_name = ?, youtube_channel_thumbnail = ?,
            youtube_subscribers = ?, youtube_access_token = ?, youtube_refresh_token = ?,
            youtube_token_expiry = ?, updated_at = ?
           WHERE id = ?`,
          [
            channel.id as string,
            snippet.title as string,
            thumbs?.default?.url ?? thumbs?.medium?.url ?? null,
            Number(stats.subscriberCount ?? 0),
            tokens.access_token,
            tokens.refresh_token ?? null,
            expiry,
            nowIso(),
            creatorId,
          ],
        );

        // Redirect with channel info in query params so client can update localStorage
        const params = new URLSearchParams({
          connected: "1",
          channelId: channel.id as string,
          channelName: snippet.title as string,
          creatorId,
        });
        return new Response(null, {
          status: 302,
          headers: { Location: `/dashboard/connected?${params.toString()}` },
        });
      },
    },
  },
});
