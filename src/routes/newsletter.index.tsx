import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/subscribers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/newsletter/")({
  head: () => ({
    meta: [
      { title: "Ventes Privées — Inscription Newsletter" },
      { name: "description", content: "Recevez nos ventes privées en avant-première." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [form, setForm] = useState({
    email: "", motivation: "", country: "", gender: "" as "" | "male" | "female" | "other", interest: "",
  });
  const [done, setDone] = useState<{ already: boolean } | null>(null);

  const m = useMutation({
    mutationFn: () =>
      subscribe({
        data: {
          email: form.email,
          motivation: form.motivation || undefined,
          country: form.country || undefined,
          gender: form.gender || undefined,
          interest: form.interest || undefined,
        },
      }),
    onSuccess: (r) => setDone({ already: !!r.alreadyConfirmed }),
  });

  if (done) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">
            {done.already ? "Vous êtes déjà inscrit·e" : "Vérifiez votre boîte mail"}
          </h1>
          <p className="text-muted-foreground">
            {done.already
              ? "Cette adresse est déjà confirmée — rien à faire."
              : "Nous venons de vous envoyer un email de confirmation. Cliquez sur le lien pour finaliser votre inscription."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Ventes privées
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Recevez nos offres en avant-première</h1>
        <p className="text-muted-foreground text-sm">
          Inscrivez-vous à notre newsletter et bénéficiez d'accès exclusifs.
        </p>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (form.email) m.mutate(); }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vous@exemple.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Pays</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="France" />
          </div>
          <div className="space-y-1.5">
            <Label>Genre</Label>
            <Select
              value={form.gender || "skip"}
              onValueChange={(v) => setForm({ ...form, gender: v === "skip" ? "" : (v as "male" | "female" | "other") })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Préfère ne pas dire</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Centre d'intérêt</Label>
          <Input
            value={form.interest}
            onChange={(e) => setForm({ ...form, interest: e.target.value })}
            placeholder="Mode, voyage, gaming..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Qu'attendez-vous de notre newsletter ?</Label>
          <Textarea
            rows={3}
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            placeholder="Bons plans, offres limitées, nouveautés..."
          />
        </div>
        {m.isError && (
          <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">
            {(m.error as Error).message}
          </div>
        )}
        <Button type="submit" className="w-full gap-2" disabled={m.isPending}>
          <Mail className="h-4 w-4" />
          {m.isPending ? "Envoi..." : "S'inscrire à la newsletter"}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          Double opt-in : vous recevrez un email pour confirmer votre inscription.
          Désinscription à tout moment.
        </p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-pink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border bg-card shadow-xl p-8">
        {children}
      </div>
    </div>
  );
}
