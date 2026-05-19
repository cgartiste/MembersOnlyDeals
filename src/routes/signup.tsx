import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { creatorSignup } from "@/lib/creator.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("creator_session")) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  const signupFn = useServerFn(creatorSignup);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);

  const m = useMutation({
    mutationFn: () => signupFn({ data: { name: form.name, email: form.email, password: form.password } }),
    onSuccess: (r) => {
      localStorage.setItem("creator_session", JSON.stringify({ id: r.id, email: r.email, name: r.name, hasYoutube: false }));
      window.location.href = "/onboarding";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Les mots de passe ne correspondent pas."); return; }
    if (form.password.length < 8) { toast.error("Le mot de passe doit faire au moins 8 caractères."); return; }
    m.mutate();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
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
          <h1 className="text-2xl font-extrabold tracking-tight">Créer votre compte</h1>
          <p className="text-sm text-neutral-500 mt-1">Rejoignez 2 400+ créateurs qui utilisent TubeMind</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Votre nom</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="John Doe" required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              placeholder="vous@exemple.com" required />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="8 caractères minimum" required className="pr-10" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmer le mot de passe</Label>
            <Input type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})}
              placeholder="Répétez le mot de passe" required />
          </div>

          {/* Password strength */}
          {form.password && (
            <div className="space-y-1">
              {[
                { ok: form.password.length >= 8, label: "8 caractères minimum" },
                { ok: /[A-Z]/.test(form.password), label: "Une majuscule" },
                { ok: /[0-9]/.test(form.password), label: "Un chiffre" },
              ].map(({ ok, label }) => (
                <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-neutral-400"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${ok ? "text-emerald-500" : "text-neutral-300"}`} />
                  {label}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-violet-600 to-pink-500 hover:opacity-90 text-white border-0 font-semibold gap-2" disabled={m.isPending}>
            {m.isPending ? "Création en cours…" : (<>Créer mon compte <ArrowRight className="h-4 w-4" /></>)}
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-400">
          En créant un compte vous acceptez nos{" "}
          <a href="#" className="underline text-violet-600">Conditions d'utilisation</a>
        </p>

        <div className="border-t pt-5 text-center text-sm text-neutral-500">
          Vous avez déjà un compte ?{" "}
          <Link to="/creator-login" className="font-semibold text-violet-600 hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
