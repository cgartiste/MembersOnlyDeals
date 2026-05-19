import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCreator } from "@/lib/creator.server";

export type CreatorSession = {
  id: string;
  email: string;
  name: string | null;
  hasYoutube: boolean;
  channelName: string | null;
  plan: string;
};

function readLocalSession(): CreatorSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("creator_session") ?? "null") as CreatorSession;
  } catch {
    return null;
  }
}

function writeLocalSession(s: CreatorSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem("creator_session", JSON.stringify(s));
}

export function useCreatorSession() {
  const local = readLocalSession();
  const getCreatorFn = useServerFn(getCreator);

  // Always fetch fresh data from DB to detect YouTube connection
  const { data: dbCreator } = useQuery({
    queryKey: ["creator-session-sync", local?.id],
    queryFn: async () => {
      if (!local?.id) return null;
      const c = await getCreatorFn({ data: { id: local.id } });
      if (!c) return null;

      const hasYoutube = !!c.youtube_channel_id;
      const channelName = c.youtube_channel_name ?? null;

      // Sync localStorage if YouTube status changed
      if (local.hasYoutube !== hasYoutube || local.channelName !== channelName) {
        const updated: CreatorSession = {
          ...local,
          hasYoutube,
          channelName,
          plan: c.plan ?? local.plan ?? "free",
        };
        writeLocalSession(updated);
      }

      return c;
    },
    enabled: !!local?.id,
    staleTime: 30_000, // re-check every 30s
    retry: false,
  });

  // Merge: DB is source of truth for YouTube status
  const session: CreatorSession | null = local
    ? {
        ...local,
        hasYoutube: dbCreator ? !!dbCreator.youtube_channel_id : local.hasYoutube,
        channelName: dbCreator?.youtube_channel_name ?? local.channelName,
        plan: dbCreator?.plan ?? local.plan ?? "free",
      }
    : null;

  function logout() {
    localStorage.removeItem("creator_session");
    window.location.href = "/";
  }

  return { session, logout };
}
