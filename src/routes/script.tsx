import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";
import { generateScript, type AIProvider } from "@/lib/ai.server";
import { AIProviderSelect } from "@/components/ai-provider-select";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";

type Session = { id: string; name: string | null; plan: string };

export const Route = createFileRoute("/script")({
  head: () => ({ meta: [{ title: "Script AI — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: ScriptPage,
});

function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session; }
  catch { return null; }
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copié" : "Copier"}
    </Button>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50">
        <span className="font-semibold text-sm">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-neutral-100">{children}</div>}
    </div>
  );
}

export default function ScriptPage() {
  const session = getSession();
  const genFn = useServerFn(generateScript);

  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [form, setForm] = useState({ topic: "", niche: "", duration: "8-12min" as const, style: "educational" as const, audience: "", language: "fr" as const });
  const [result, setResult] = useState<Awaited<ReturnType<typeof genFn>> | null>(null);

  const m = useMutation({
    mutationFn: () => genFn({ data: { ...form, provider } }),
    onSuccess: (r) => setResult(r),
    onError: (e: Error) => toast.error(e.message),
  });

  function handleLogout() { localStorage.removeItem("creator_session"); window.location.href = "/"; }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Script AI</h1>
            <p className="text-xs text-neutral-400">Générez un script complet optimisé pour YouTube</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Paramètres du script</h2>
                </div>
                <AIProviderSelect value={provider} onChange={setProvider} />
                <div className="space-y-1.5">
                  <Label>Sujet / Topic *</Label>
                  <Textarea value={form.topic} onChange={e => setForm({...form, topic: e.target.value})}
                    placeholder="Ex: Comment gagner de l'argent avec YouTube en 2025..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Niche de la chaîne</Label>
                  <Input value={form.niche} onChange={e => setForm({...form, niche: e.target.value})} placeholder="Finance, Gaming, Cuisine..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Durée cible</Label>
                    <Select value={form.duration} onValueChange={v => setForm({...form, duration: v as typeof form.duration})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-5min">3-5 min (Short)</SelectItem>
                        <SelectItem value="8-12min">8-12 min (Standard)</SelectItem>
                        <SelectItem value="15-20min">15-20 min (Long)</SelectItem>
                        <SelectItem value="20+">20+ min (Deep dive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Style</Label>
                    <Select value={form.style} onValueChange={v => setForm({...form, style: v as typeof form.style})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="educational">Éducatif</SelectItem>
                        <SelectItem value="entertaining">Divertissant</SelectItem>
                        <SelectItem value="storytelling">Storytelling</SelectItem>
                        <SelectItem value="tutorial">Tutoriel</SelectItem>
                        <SelectItem value="vlog">Vlog</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Audience cible</Label>
                  <Input value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} placeholder="Débutants, entrepreneurs, ados..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Langue</Label>
                  <Select value={form.language} onValueChange={v => setForm({...form, language: v as typeof form.language})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => m.mutate()} disabled={!form.topic || m.isPending}
                  className="w-full h-11 bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0 font-semibold gap-2">
                  {m.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</> : <><Sparkles className="h-4 w-4" /> Générer le script</>}
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {!result && !m.isPending && (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-16 text-center text-neutral-400">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Remplissez le formulaire et cliquez sur Générer</p>
                  <p className="text-xs mt-1 opacity-70">Claude génère script + titre + description + tags + posts sociaux</p>
                </div>
              )}
              {m.isPending && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-16 text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 text-violet-500 animate-spin" />
                  <p className="text-sm text-violet-700 font-medium">Claude rédige votre script…</p>
                  <p className="text-xs text-violet-500 mt-1">30-60 secondes</p>
                </div>
              )}
              {result && (
                <Tabs defaultValue="script">
                  <TabsList>
                    <TabsTrigger value="script">Script</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                    <TabsTrigger value="social">Réseaux sociaux</TabsTrigger>
                  </TabsList>

                  <TabsContent value="script" className="space-y-3 mt-4">
                    <Section title="🎯 Titres suggérés">
                      <div className="space-y-2">
                        {result.title_options.map((t, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-neutral-50">
                            <span className="text-sm font-medium flex-1">{t}</span>
                            <CopyBtn text={t} />
                          </div>
                        ))}
                      </div>
                    </Section>
                    <Section title="🔥 Hook — Les 30 premières secondes">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-700 leading-relaxed flex-1 whitespace-pre-wrap">{result.hook}</p>
                        <CopyBtn text={result.hook} />
                      </div>
                    </Section>
                    <Section title="📖 Introduction">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-700 leading-relaxed flex-1 whitespace-pre-wrap">{result.intro}</p>
                        <CopyBtn text={result.intro} />
                      </div>
                    </Section>
                    {result.sections.map((s, i) => (
                      <Section key={i} title={`📌 ${s.title} (${s.duration})`} defaultOpen={i === 0}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-neutral-700 leading-relaxed flex-1 whitespace-pre-wrap">{s.content}</p>
                          <CopyBtn text={s.content} />
                        </div>
                      </Section>
                    ))}
                    <Section title="🎬 Outro + CTA">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-neutral-700 leading-relaxed flex-1 whitespace-pre-wrap">{result.outro}</p>
                          <CopyBtn text={result.outro} />
                        </div>
                        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 flex items-start justify-between gap-3">
                          <div><div className="text-xs font-semibold text-violet-700 mb-1">Call-to-Action</div>
                          <p className="text-sm text-violet-800">{result.cta}</p></div>
                          <CopyBtn text={result.cta} />
                        </div>
                      </div>
                    </Section>
                    <Section title="⏱️ Chapitres / Timestamps">
                      <div className="space-y-1">
                        {result.chapters.map((c, i) => (
                          <div key={i} className="text-sm font-mono text-neutral-700">{c}</div>
                        ))}
                        <CopyBtn text={result.chapters.join("\n")} />
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="seo" className="space-y-3 mt-4">
                    <Section title="📝 Description YouTube (SEO)">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-700 leading-relaxed flex-1 whitespace-pre-wrap">{result.description}</p>
                        <CopyBtn text={result.description} />
                      </div>
                    </Section>
                    <Section title="🏷️ Tags">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.tags.map((t) => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">{t}</span>
                        ))}
                      </div>
                      <CopyBtn text={result.tags.join(", ")} />
                    </Section>
                    <Section title="🖼️ Texte Miniature">
                      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900 text-white">
                        <span className="text-lg font-extrabold uppercase text-center flex-1">{result.thumbnail_text}</span>
                        <CopyBtn text={result.thumbnail_text} />
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-3 mt-4">
                    <Section title="🐦 Twitter / X">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-700 flex-1">{result.tweet}</p>
                        <CopyBtn text={result.tweet} />
                      </div>
                    </Section>
                    <Section title="📸 Instagram">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-700 flex-1 whitespace-pre-wrap">{result.instagram_caption}</p>
                        <CopyBtn text={result.instagram_caption} />
                      </div>
                    </Section>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
