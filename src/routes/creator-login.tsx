import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { creatorLogin } from "@/lib/creator.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/creator-login")({
  head: () => ({ meta: [{ title: "Connexion — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("creator_session")) throw redirect({ to: "/dashboard" });
  },
  component: CreatorLoginPage,
});

function CreatorLoginPage() {
  const loginFn = useServerFn(creatorLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const m = useMutation({
    mutationFn: () => loginFn({ data: { email, password } }),
    onSuccess: (r) => {
      localStorage.setItem("creator_session", JSON.stringify({
        id: r.creator.id, email: r.creator.email, name: r.creator.name,
        hasYoutube: !!r.creator.youtube_channel_id,
        channelName: r.creator.youtube_channel_name,
      }));
      window.location.href = r.creator.youtube_channel_id ? "/dashboard" : "/onboarding";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2 mb-10">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-extrabold tracking-tight">
          Tube<span className="text-violet-600">Mind</span>
        </span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Bienvenue</h1>
          <p className="text-sm text-neutral-500 mt-1">Connectez-vous à votre espace TubeMind</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com" required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe" required autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-violet-600 to-pink-500 hover:opacity-90 text-white border-0 font-semibold gap-2" disabled={m.isPending}>
            {m.isPending ? "Connexion…" : (<>Se connecter <ArrowRight className="h-4 w-4" /></>)}
          </Button>
        </form>

        <div className="border-t pt-5 text-center text-sm text-neutral-500">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="font-semibold text-violet-600 hover:underline">Créer un compte gratuit</Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Accès admin ?{" "}
        <Link to="/login" className="text-neutral-500 hover:underline">Panneau administrateur</Link>
      </p>
    </div>
  );
}
