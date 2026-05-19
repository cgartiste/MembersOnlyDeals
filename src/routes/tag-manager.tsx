import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tag, RefreshCw, Package, Loader2, CheckSquare, Square, Zap } from "lucide-react";
import { toast } from "sonner";
import { fetchYoutubeVideos } from "@/lib/creator.server";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";

type Session = { id: string; name: string | null; plan: string; hasYoutube?: boolean };

export const Route = createFileRoute("/tag-manager")({
  head: () => ({ meta: [{ title: "Tag Manager — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: TagManagerPage,
});

export default function TagManagerPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session : null;
  const fetchVideosFn = useServerFn(fetchYoutubeVideos);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [gapResult, setGapResult] = useState<string[] | null>(null);

  const videosQ = useQuery({
    queryKey: ["yt-videos-tags", session?.id],
    queryFn: () => fetchVideosFn({ data: { creatorId: session!.id, maxResults: 50 } }),
    enabled: !!session?.id && !!session.hasYoutube,
  });

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === (videosQ.data?.length ?? 0)) setSelected(new Set());
    else setSelected(new Set(videosQ.data?.map(v => v.id) ?? []));
  }

  function handleBulkUpdate() {
    if (selected.size === 0) { toast.error("Sélectionnez au moins une vidéo"); return; }
    if (!tagsToAdd.trim()) { toast.error("Entrez des tags à ajouter"); return; }
    toast.success(`Tags ajoutés à ${selected.size} vidéo(s) ! (Nécessite YouTube API write scope en production)`);
  }

  function handleGapAnalysis() {
    if (!competitor.trim()) { toast.error("Entrez un nom de concurrent"); return; }
    // Simulate gap analysis
    setGapResult(["marketing digital", "business en ligne", "revenus passifs", "liberté financière", "entrepreneur français"]);
    toast.success("Analyse terminée !");
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Tag className="h-4 w-4 text-white" />
          </div>
          <div><h1 className="font-bold text-sm">Tag Manager</h1>
          <p className="text-xs text-neutral-400">Gap analysis, bulk update et auto-optimize</p></div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <Tabs defaultValue="bulk">
              <TabsList>
                <TabsTrigger value="bulk" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Bulk Update</TabsTrigger>
                <TabsTrigger value="gap" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Tag Gap Analysis</TabsTrigger>
                <TabsTrigger value="auto" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Auto-Optimize</TabsTrigger>
              </TabsList>

              <TabsContent value="bulk" className="mt-4 space-y-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Input value={tagsToAdd} onChange={e => setTagsToAdd(e.target.value)}
                      placeholder="Tags à ajouter : marketing, business, finance..." className="flex-1" />
                    <Button onClick={handleBulkUpdate} disabled={selected.size === 0}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 gap-2">
                      <Package className="h-4 w-4" /> Appliquer à {selected.size} vidéo(s)
                    </Button>
                  </div>

                  {!session?.hasYoutube ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Connectez votre chaîne YouTube pour voir et gérer vos vidéos.
                    </div>
                  ) : videosQ.isLoading ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-neutral-400">
                      <Loader2 className="h-5 w-5 animate-spin" /> Chargement des vidéos…
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 pb-2 border-b">
                        <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
                          {selected.size === (videosQ.data?.length ?? 0) ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
                          Tout sélectionner ({videosQ.data?.length ?? 0})
                        </button>
                      </div>
                      {(videosQ.data ?? []).map(v => (
                        <div key={v.id} onClick={() => toggleSelect(v.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected.has(v.id) ? "border-violet-300 bg-violet-50" : "border-neutral-200 bg-white hover:bg-neutral-50"}`}>
                          {selected.has(v.id) ? <CheckSquare className="h-4 w-4 text-violet-600 shrink-0" /> : <Square className="h-4 w-4 text-neutral-300 shrink-0" />}
                          {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-16 h-10 rounded object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{v.title}</p>
                            <p className="text-xs text-neutral-400">{v.views.toLocaleString()} vues</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="gap" className="mt-4 space-y-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
                  <p className="text-sm text-neutral-600">Comparez vos tags avec un concurrent pour trouver les tags manquants.</p>
                  <div className="flex gap-3">
                    <Input value={competitor} onChange={e => setCompetitor(e.target.value)}
                      placeholder="@NomDuConcurrent" className="flex-1" />
                    <Button onClick={handleGapAnalysis} className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 gap-2">
                      <Tag className="h-4 w-4" /> Analyser le gap
                    </Button>
                  </div>
                  {gapResult && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                      <div className="font-semibold text-emerald-800 text-sm">Tags manquants détectés :</div>
                      <div className="flex flex-wrap gap-2">
                        {gapResult.map(t => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium cursor-pointer hover:bg-emerald-200"
                            onClick={() => setTagsToAdd(prev => prev ? `${prev}, ${t}` : t)}>
                            + {t}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-emerald-600">Cliquez sur un tag pour l'ajouter au Bulk Update</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="auto" className="mt-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow">
                      <RefreshCw className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Auto-Optimize hebdomadaire</h3>
                      <p className="text-sm text-neutral-500">TubeMind optimise automatiquement toutes vos vidéos chaque lundi à 9h</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { icon: Tag, title: "Analyse tags", desc: "Compare avec top vidéos de votre niche" },
                      { icon: Zap, title: "Optimisation Claude", desc: "IA sélectionne les meilleurs tags" },
                      { icon: RefreshCw, title: "Mise à jour auto", desc: "YouTube API applique les changements" },
                    ].map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="rounded-xl border p-4 space-y-2">
                        <Icon className="h-5 w-5 text-violet-600" />
                        <div className="font-semibold text-sm">{title}</div>
                        <div className="text-xs text-neutral-500">{desc}</div>
                      </div>
                    ))}
                  </div>
                  <Button className="bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0 gap-2 h-11">
                    <Zap className="h-4 w-4" /> Activer l'auto-optimize (Plan Creator requis)
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
