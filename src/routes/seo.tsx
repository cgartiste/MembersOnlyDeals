import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Loader2, Check, Copy, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { optimizeSEO } from "@/lib/claude.server";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type Session = { id: string; name: string | null; plan: string };

export const Route = createFileRoute("/seo")({
  head: () => ({ meta: [{ title: "SEO Optimizer — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: SEOPage,
});

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        className="rotate-90" style={{ fontSize: 18, fontWeight: 800, fill: color, transform: `rotate(90deg)`, transformOrigin: "center" }}>
        {score}
      </text>
    </svg>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : "Copier"}
    </Button>
  );
}

export default function SEOPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session : null;
  const optimizeFn = useServerFn(optimizeSEO);
  const [form, setForm] = useState({ title: "", description: "", tags: "", niche: "" });
  const [result, setResult] = useState<Awaited<ReturnType<typeof optimizeFn>> | null>(null);

  const m = useMutation({
    mutationFn: () => optimizeFn({ data: form }),
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">SEO Optimizer</h1>
            <p className="text-xs text-neutral-400">Optimisez titre, description et tags pour maximiser la visibilité</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 h-fit">
              <h2 className="font-semibold">Métadonnées actuelles</h2>
              <div className="space-y-1.5">
                <Label>Titre actuel *</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Le titre actuel de votre vidéo" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={5} placeholder="Description actuelle..." />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (séparés par virgules)</Label>
                <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="tag1, tag2, tag3..." />
              </div>
              <div className="space-y-1.5">
                <Label>Niche</Label>
                <Input value={form.niche} onChange={e => setForm({...form, niche: e.target.value})} placeholder="Finance, Gaming, Cuisine..." />
              </div>
              <Button onClick={() => m.mutate()} disabled={!form.title || m.isPending}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 font-semibold gap-2">
                {m.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…</> : <><TrendingUp className="h-4 w-4" /> Analyser & Optimiser</>}
              </Button>
            </div>

            <div className="space-y-4">
              {!result && !m.isPending && (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Entrez vos métadonnées pour obtenir un score SEO complet</p>
                </div>
              )}
              {m.isPending && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-16 text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-700 font-medium">Analyse SEO en cours…</p>
                </div>
              )}
              {result && (
                <div className="space-y-4">
                  {/* Scores */}
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <h3 className="font-semibold mb-5">Score SEO global</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      {[
                        { label: "Global", score: result.overall_score },
                        { label: "Titre", score: result.title_score },
                        { label: "Description", score: result.description_score },
                        { label: "Tags", score: result.tags_score },
                      ].map(({ label, score }) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className="relative flex items-center justify-center h-20 w-20">
                            <svg width="80" height="80" className="-rotate-90 absolute">
                              <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                              <circle cx="40" cy="40" r="32" fill="none"
                                stroke={score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="8"
                                strokeDasharray={`${(score/100)*201} ${201-(score/100)*201}`}
                                strokeLinecap="round" />
                            </svg>
                            <span className="text-xl font-extrabold z-10" style={{ color: score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444" }}>{score}</span>
                          </div>
                          <span className="text-xs font-medium text-neutral-500">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Titre optimisé */}
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                    <h3 className="font-semibold">Titres optimisés</h3>
                    {result.title_issues.length > 0 && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                        {result.title_issues.map((i, idx) => <div key={idx} className="flex items-center gap-2 text-xs text-amber-700"><AlertCircle className="h-3 w-3" />{i}</div>)}
                      </div>
                    )}
                    <div className="space-y-2">
                      {result.title_suggestions.map((t, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-neutral-50">
                          <span className="text-sm font-medium flex-1">{t}</span>
                          <CopyBtn text={t} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Tags optimisés</h3>
                      <CopyBtn text={result.tags_optimized.join(", ")} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.tags_to_add.map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {t}
                        </span>
                      ))}
                      {result.tags_optimized.filter(t => !result.tags_to_add.includes(t)).map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">{t}</span>
                      ))}
                      {result.tags_to_remove.map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-500 font-medium line-through">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Description optimisée</h3>
                      <CopyBtn text={result.description_optimized} />
                    </div>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{result.description_optimized}</p>
                  </div>

                  {/* Opportunités */}
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-2">
                    <h3 className="font-semibold text-violet-800">Top opportunités</h3>
                    {result.top_opportunities.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-violet-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-violet-500" />{o}
                      </div>
                    ))}
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
