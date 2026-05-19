import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Loader2, Copy, Check, Lightbulb, Target, Tag } from "lucide-react";
import { toast } from "sonner";
import { analyzeCompetitor } from "@/lib/claude.server";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/competitors")({
  head: () => ({ meta: [{ title: "Competitor Research — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: CompetitorsPage,
});

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export default function CompetitorsPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") : null;
  const analyzeFn = useServerFn(analyzeCompetitor);
  const [form, setForm] = useState({ channelName: "", niche: "", topVideos: "" });
  const [result, setResult] = useState<Awaited<ReturnType<typeof analyzeFn>> | null>(null);

  const m = useMutation({
    mutationFn: () => analyzeFn({ data: form }),
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Search className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Competitor Research</h1>
            <p className="text-xs text-neutral-400">Analysez vos concurrents et volez leurs meilleures stratégies</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 h-fit">
              <h2 className="font-semibold">Analyser un concurrent</h2>
              <div className="space-y-1.5">
                <Label>Nom de la chaîne *</Label>
                <Input value={form.channelName} onChange={e => setForm({...form, channelName: e.target.value})}
                  placeholder="@NomDuConcurrent ou URL" />
              </div>
              <div className="space-y-1.5">
                <Label>Niche commune</Label>
                <Input value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}
                  placeholder="Finance personnelle, Gaming..." />
              </div>
              <div className="space-y-1.5">
                <Label>Leurs titres de vidéos (optionnel)</Label>
                <Textarea value={form.topVideos} onChange={e => setForm({...form, topVideos: e.target.value})} rows={6}
                  placeholder="Collez leurs titres de vidéos pour une analyse plus précise..." />
                <p className="text-xs text-neutral-400">Copiez les titres depuis leur chaîne YouTube pour une meilleure analyse</p>
              </div>
              <Button onClick={() => m.mutate()} disabled={!form.channelName || m.isPending}
                className="w-full h-11 bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 font-semibold gap-2">
                {m.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse…</> : <><Search className="h-4 w-4" /> Analyser ce concurrent</>}
              </Button>
            </div>

            <div className="space-y-4">
              {!result && !m.isPending && (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Entrez le nom d'un concurrent pour analyser sa stratégie</p>
                </div>
              )}
              {m.isPending && (
                <div className="rounded-2xl border border-pink-200 bg-pink-50 p-16 text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 text-pink-500 animate-spin" />
                  <p className="text-sm text-pink-700 font-medium">Claude analyse le concurrent…</p>
                </div>
              )}
              {result && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <h3 className="font-semibold mb-3">Vue d'ensemble</h3>
                    <p className="text-sm text-neutral-700 leading-relaxed">{result.overall_assessment}</p>
                    <div className="mt-3 flex gap-3 flex-wrap text-xs">
                      <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-600">📅 {result.posting_frequency}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-pink-500" /> Patterns de titres</h3>
                      <ul className="space-y-2">{result.title_patterns.map((p, i) => (
                        <li key={i} className="text-sm text-neutral-600 flex items-start gap-2"><span className="text-pink-400 mt-1">→</span>{p}</li>
                      ))}</ul>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Sujets gagnants</h3>
                      <ul className="space-y-2">{result.winning_topics.map((t, i) => (
                        <li key={i} className="text-sm text-neutral-600 flex items-start gap-2"><span className="text-amber-400 mt-1">★</span>{t}</li>
                      ))}</ul>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
                    <h3 className="font-semibold text-emerald-800">🎯 Opportunités pour ta chaîne</h3>
                    <ul className="space-y-2">{result.content_gaps.map((g, i) => (
                      <li key={i} className="text-sm text-emerald-700 flex items-start gap-2"><span className="font-bold mt-0.5">✓</span>{g}</li>
                    ))}</ul>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-violet-500" /> Tags à récupérer</h3>
                      <CopyBtn text={result.recommended_tags.join(", ")} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.recommended_tags.map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                    <h3 className="font-semibold">💡 Idées de vidéos inspirées</h3>
                    <div className="space-y-2">
                      {result.video_ideas.map((idea, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-neutral-50">
                          <span className="text-sm flex-1">{idea}</span>
                          <CopyBtn text={idea} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
