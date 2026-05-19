import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { Brain, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/connected")({
  validateSearch: z.object({
    connected: z.string().optional(),
    channelId: z.string().optional(),
    channelName: z.string().optional(),
    creatorId: z.string().optional(),
    error: z.string().optional(),
  }).parse,
  component: ConnectedPage,
});

function ConnectedPage() {
  const { connected, channelName, error } = Route.useSearch();

  useEffect(() => {
    if (connected && channelName) {
      try {
        const session = JSON.parse(localStorage.getItem("creator_session") ?? "{}");
        session.hasYoutube = true;
        session.channelName = channelName;
        localStorage.setItem("creator_session", JSON.stringify(session));
      } catch { /* ignore */ }
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } else if (error) {
      setTimeout(() => { window.location.href = "/onboarding?error=" + error; }, 1500);
    } else {
      window.location.href = "/dashboard";
    }
  }, [connected, channelName, error]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="text-center space-y-3">
          <div className="text-rose-600 font-semibold">Erreur de connexion</div>
          <p className="text-sm text-neutral-500">Redirection en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50 gap-6">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-xl">
        <Brain className="h-8 w-8 text-white" />
      </div>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
          <CheckCircle2 className="h-6 w-6" />
          Chaîne connectée !
        </div>
        <p className="text-neutral-500 text-sm">{channelName} est maintenant lié à TubeMind</p>
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 mt-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirection vers le dashboard…
        </div>
      </div>
    </div>
  );
}
