import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbFirst, dbRun, newId, nowIso } from "./db.server";

/* ── Password hashing (PBKDF2 via Web Crypto) ── */
async function hashPassword(password: string): Promise<string> {
  const salt = "tubemind_static_salt_v1"; // add per-user salt in production
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100_000, hash: "SHA-256" },
    key, 256,
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type CreatorDTO = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  youtube_channel_id: string | null;
  youtube_channel_name: string | null;
  youtube_channel_thumbnail: string | null;
  youtube_subscribers: number | null;
  plan: string;
};

/* ── Signup ── */
export const creatorSignup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
    }).parse,
  )
  .handler(async ({ data }) => {
    const existing = await dbFirst("SELECT id FROM tubemind_creators WHERE email = ?", [data.email.toLowerCase()]);
    if (existing) throw new Error("Un compte existe déjà avec cet email.");
    const hash = await hashPassword(data.password);
    const id = newId();
    await dbRun(
      "INSERT INTO tubemind_creators (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
      [id, data.email.toLowerCase(), hash, data.name],
    );
    return { ok: true, id, email: data.email.toLowerCase(), name: data.name };
  });

/* ── Login ── */
export const creatorLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse,
  )
  .handler(async ({ data }) => {
    const creator = await dbFirst<{
      id: string; email: string; password_hash: string; name: string | null;
      youtube_channel_id: string | null; youtube_channel_name: string | null;
      youtube_channel_thumbnail: string | null; youtube_subscribers: number | null;
      plan: string; avatar_url: string | null;
    }>(
      "SELECT id, email, password_hash, name, youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail, youtube_subscribers, plan, avatar_url FROM tubemind_creators WHERE email = ?",
      [data.email.toLowerCase()],
    );
    if (!creator) throw new Error("Email ou mot de passe incorrect.");
    const hash = await hashPassword(data.password);
    if (hash !== creator.password_hash) throw new Error("Email ou mot de passe incorrect.");
    const { password_hash: _, ...safe } = creator;
    return { ok: true, creator: safe };
  });

/* ── Get creator by ID ── */
export const getCreator = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }): Promise<CreatorDTO | null> => {
    return dbFirst<CreatorDTO>(
      "SELECT id, email, name, avatar_url, youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail, youtube_subscribers, plan FROM tubemind_creators WHERE id = ?",
      [data.id],
    );
  });

/* ── Save YouTube channel info ── */
export const saveYoutubeChannel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      creatorId: z.string().uuid(),
      channelId: z.string(),
      channelName: z.string(),
      thumbnail: z.string().optional(),
      subscribers: z.number().optional(),
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      tokenExpiry: z.string().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    await dbRun(
      `UPDATE tubemind_creators SET
        youtube_channel_id = ?, youtube_channel_name = ?, youtube_channel_thumbnail = ?,
        youtube_subscribers = ?, youtube_access_token = ?, youtube_refresh_token = ?,
        youtube_token_expiry = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.channelId, data.channelName, data.thumbnail ?? null,
        data.subscribers ?? null, data.accessToken, data.refreshToken ?? null,
        data.tokenExpiry ?? null, nowIso(), data.creatorId,
      ],
    );
    return { ok: true };
  });

/* ── Fetch YouTube channel stats via API ── */
export const fetchYoutubeChannel = createServerFn({ method: "POST" })
  .inputValidator(z.object({ creatorId: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const creator = await dbFirst<{
      youtube_channel_id: string | null;
      youtube_access_token: string | null;
    }>(
      "SELECT youtube_channel_id, youtube_access_token FROM tubemind_creators WHERE id = ?",
      [data.creatorId],
    );
    if (!creator?.youtube_access_token) throw new Error("Chaîne YouTube non connectée.");

    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true",
      { headers: { Authorization: `Bearer ${creator.youtube_access_token}` } },
    );
    if (!res.ok) throw new Error("Token YouTube expiré. Veuillez reconnecter votre chaîne.");
    const json = await res.json() as { items?: Array<Record<string, unknown>> };
    const channel = json.items?.[0];
    if (!channel) throw new Error("Aucune chaîne trouvée.");

    const snippet = channel.snippet as Record<string, unknown>;
    const stats = channel.statistics as Record<string, unknown>;
    const branding = (channel.brandingSettings as Record<string, unknown>)?.image as Record<string, unknown>;

    return {
      id: channel.id as string,
      name: snippet.title as string,
      description: snippet.description as string,
      thumbnail: (snippet.thumbnails as Record<string, unknown>)?.default as Record<string, unknown>,
      banner: branding?.bannerExternalUrl as string ?? null,
      subscribers: Number(stats.subscriberCount ?? 0),
      views: Number(stats.viewCount ?? 0),
      videos: Number(stats.videoCount ?? 0),
      country: snippet.country as string ?? null,
    };
  });

/* ── Fetch recent YouTube videos ── */
export const fetchYoutubeVideos = createServerFn({ method: "POST" })
  .inputValidator(z.object({ creatorId: z.string().uuid(), maxResults: z.number().default(12) }).parse)
  .handler(async ({ data }) => {
    const creator = await dbFirst<{ youtube_access_token: string | null }>(
      "SELECT youtube_access_token FROM tubemind_creators WHERE id = ?",
      [data.creatorId],
    );
    if (!creator?.youtube_access_token) throw new Error("Chaîne non connectée.");

    // Get recent video IDs
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=${data.maxResults}`,
      { headers: { Authorization: `Bearer ${creator.youtube_access_token}` } },
    );
    if (!searchRes.ok) throw new Error("Erreur YouTube API.");
    const searchJson = await searchRes.json() as { items?: Array<Record<string, unknown>> };
    const ids = (searchJson.items ?? []).map((i) => (i.id as Record<string, unknown>).videoId as string).filter(Boolean);
    if (ids.length === 0) return [];

    // Get video stats
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}`,
      { headers: { Authorization: `Bearer ${creator.youtube_access_token}` } },
    );
    const videoJson = await videoRes.json() as { items?: Array<Record<string, unknown>> };

    return (videoJson.items ?? []).map((v) => {
      const sn = v.snippet as Record<string, unknown>;
      const st = v.statistics as Record<string, unknown>;
      return {
        id: v.id as string,
        title: sn.title as string,
        thumbnail: ((sn.thumbnails as Record<string, unknown>)?.medium as Record<string, unknown>)?.url as string,
        publishedAt: sn.publishedAt as string,
        views: Number(st.viewCount ?? 0),
        likes: Number(st.likeCount ?? 0),
        comments: Number(st.commentCount ?? 0),
      };
    });
  });
