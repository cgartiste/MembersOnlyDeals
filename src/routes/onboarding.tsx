import { createFileRoute, redirect } from "@tanstack/react-router";
import { Brain, Youtube, CheckCircle2, ArrowRight, Shield, BarChart3, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Connectez votre chaîne — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const session = localStorage.getItem("creator_session");
    if (!session) throw redirect({ to: "/signup" });
    try {
      const s = JSON.parse(session) as { hasYoutube?: boolean };
      if (s.hasYoutube) throw redirect({ to: "/dashboard" });
    } catch { /* continue */ }
  },
  component: OnboardingPage,
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const REDIRECT_URI = import.meta.env.VITE_APP_URL
  ? `${import.meta.env.VITE_APP_URL}/api/auth/youtube/callback`
  : "http://localhost:8080/api/auth/youtube/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

function buildOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: "tubemind_youtube_connect",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function OnboardingPage() {
  const session = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("creator_session") ?? "{}") as { name?: string }
    : {};

  const firstName = session.name?.split(" ")[0] ?? "là";

  function connectYoutube() {
    if (!GOOGLE_CLIENT_ID) {
      alert("Google Client ID non configuré. Ajoutez VITE_GOOGLE_CLIENT_ID dans .env");
      return;
    }
    window.location.href = buildOAuthUrl();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-6">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-extrabold">Tube<span className="text-violet-600">Mind</span></span>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-4">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium text-neutral-600">Compte créé</span>
          </div>
          <div className="flex-1 h-0.5 bg-violet-200 mx-2" />
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow">
              2
            </div>
            <span className="font-bold text-violet-700">Connecter YouTube</span>
          </div>
          <div className="flex-1 h-0.5 bg-neutral-200 mx-2" />
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold">
              3
            </div>
            <span className="text-neutral-400">Dashboard</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center">
            <div className="inline-flex h-20 w-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 items-center justify-center shadow-xl mb-6">
              <Youtube className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Salut {firstName} !<br />
              <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                Connectez votre chaîne YouTube
              </span>
            </h1>
            <p className="mt-4 text-neutral-500 max-w-md mx-auto">
              TubeMind a besoin d'accéder à votre chaîne pour analyser vos performances,
              optimiser vos vidéos et surveiller vos concurrents.
            </p>
          </div>

          {/* What we access */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
            <div className="text-sm font-semibold text-neutral-700 mb-4">Ce que TubeMind peut faire avec votre chaîne :</div>
            {[
              { icon: BarChart3, title: "Lire vos statistiques", desc: "Vues, abonnés, CTR, rétention", ok: true },
              { icon: Tag,       title: "Optimiser vos vidéos", desc: "Modifier titres, descriptions et tags", ok: true },
              { icon: Zap,       title: "Upload de vidéos",     desc: "Publier directement depuis TubeMind", ok: true },
              { icon: Shield,    title: "Accès à votre compte Google", desc: "Nous ne stockons jamais votre mot de passe", ok: true },
            ].map(({ icon: Icon, title, desc, ok }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-neutral-500">{desc}</div>
                </div>
                {ok && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              onClick={connectYoutube}
              className="w-full h-14 bg-red-600 hover:bg-red-700 text-white border-0 font-bold text-base gap-3 rounded-2xl shadow-lg shadow-red-200"
            >
              <Youtube className="h-5 w-5" />
              Connecter ma chaîne YouTube
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <p className="text-center text-xs text-neutral-400">
              <Shield className="h-3 w-3 inline mr-1" />
              Connexion sécurisée via Google OAuth 2.0 — Vous pouvez révoquer l'accès à tout moment
            </p>
          </div>

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="text-sm text-neutral-400 hover:text-neutral-600 underline underline-offset-2"
            >
              Passer pour l'instant — je ferai ça plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
