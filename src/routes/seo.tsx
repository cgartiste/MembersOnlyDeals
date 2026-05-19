import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { aiQueue, withRetry } from "@/lib/ai-queue";
import {
  TrendingUp, Eye, ThumbsUp, MessageCircle, Tag, Loader2,
  AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Copy,
  Check, X, Plus, RefreshCw, Zap, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { fetchYoutubeVideos, updateVideoTags } from "@/lib/creator.server";
import { analyzeVideoSEO, type AIProvider } from "@/lib/ai.server";
import { AIProviderSelect } from "@/components/ai-provider-select";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

type Session = { id: string; name: string | null; plan: string; hasYoutube?: boolean };
type Video = {
  id: string; title: string; description: string; thumbnail: string;
  publishedAt: string; views: number; likes: number; comments: number;
  tags: string[]; tagCount: number;
};
type Analysis = Awaited<ReturnType<typeof useServerFn<typeof analyzeVideoSEO>>>;

export const Route = createFileRoute("/seo")({
  head: () => ({ meta: [{ title: "SEO Optimizer — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: SEOPage,
});

const NOTIF_COLORS = {
  red:    "bg-red-50 border-red-200 text-red-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  yellow: "bg-amber-50 border-amber-200 text-amber-700",
  green:  "bg-emerald-50 border-emerald-200 text-emerald-700",
};
const NOTIF_DOTS = {
  red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-amber-500", green: "bg-emerald-500",
};
const SCORE_COLOR = (s: number) =>
  s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600";
const SCORE_BG = (s: number) =>
  s >= 75 ? "bg-emerald-100" : s >= 50 ? "bg-amber-100" : "bg-red-100";

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className={`font-bold ${SCORE_COLOR(score)}`}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function VideoRow({
  video, provider, onDetails, isDetailsOpen,
}: {
  video: Video; provider: AIProvider; onDetails: (v: Video) => void; isDetailsOpen: boolean;
}) {
  const analyzeFn = useServerFn(analyzeVideoSEO);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [queued, setQueued] = useState(false);
  const cancelRef = useRef(false);

  function requestAnalysis() {
    if (analyzing || queued || analysis) return;
    cancelRef.current = false;
    setQueued(true);
    aiQueue.enqueue(async () => {
      if (cancelRef.current) { setQueued(false); return; }
      setQueued(false);
      setAnalyzing(true);
      try {
        const result = await withRetry(() => analyzeFn({
          data: {
            videoId: video.id, title: video.title, description: video.description,
            tags: video.tags, views: video.views, likes: video.likes,
            comments: video.comments, provider,
          },
        }));
        if (!cancelRef.current) setAnalysis(result);
      } catch (e) {
        if (!cancelRef.current) console.warn("[SEO] Analysis failed:", e);
      } finally {
        if (!cancelRef.current) setAnalyzing(false);
      }
    });
  }

  // Reset analysis when provider changes
  useEffect(() => {
    cancelRef.current = true;
    setAnalysis(null);
    setAnalyzing(false);
    setQueued(false);
  }, [provider]);

  const notifColor = analysis?.notification_color ?? "yellow";

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${isDetailsOpen ? "ring-2 ring-violet-400 shadow-lg" : "hover:shadow-md"}`}>
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative shrink-0">
          <img src={video.thumbnail} alt={video.title}
            className="w-36 h-[81px] rounded-xl object-cover bg-neutral-100" />
          {analysis && (
            <div className={`absolute -top-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold shadow-md ${SCORE_BG(analysis.overall_score)} ${SCORE_COLOR(analysis.overall_score)}`}>
              {analysis.overall_score}
            </div>
          )}
        </div>

        {/* Info + notification */}
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{video.title}</h3>

          {/* Analytics */}
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.views.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{video.likes.toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{video.comments.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{video.tagCount} tags</span>
            <span className="text-neutral-300">·</span>
            <span>{new Date(video.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>

          {/* AI Notification Bar */}
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
              analyzing || queued ? "bg-violet-50 border-violet-200"
              : analysis ? NOTIF_COLORS[notifColor]
              : "bg-neutral-50 border-neutral-200 hover:bg-violet-50 hover:border-violet-200"
            }`}
            onClick={!analysis && !analyzing && !queued ? requestAnalysis : undefined}
          >
            {queued ? (
              <>
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
                <span className="text-violet-500 font-medium">En attente dans la file…</span>
              </>
            ) : analyzing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-violet-500 shrink-0" />
                <span className="text-violet-600 font-medium">Analyse IA en cours…</span>
              </>
            ) : analysis ? (
              <>
                <div className={`h-2 w-2 rounded-full shrink-0 ${NOTIF_DOTS[notifColor]}`} />
                <span className="flex-1 font-medium">{analysis.notification_summary}</span>
                {analysis.estimated_views_boost && (
                  <span className="shrink-0 font-bold opacity-70">{analysis.estimated_views_boost}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setAnalysis(null); requestAnalysis(); }}
                  className="shrink-0 text-neutral-400 hover:text-neutral-600"
                  title="Relancer l'analyse"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-neutral-400 shrink-0" />
                <span className="text-neutral-400">Cliquer pour analyser avec l'IA</span>
                <span className="ml-auto text-[10px] text-violet-400 font-medium">→ Analyser</span>
              </>
            )}
          </div>
        </div>

        {/* Détails button */}
        <div className="flex items-center shrink-0">
          <Button
            size="sm"
            onClick={() => onDetails(video)}
            className={`gap-1.5 h-9 ${isDetailsOpen ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-neutral-100 text-neutral-700 hover:bg-violet-50 hover:text-violet-700"} border-0`}
          >
            Détails <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick wins strip */}
      {analysis?.quick_wins && analysis.quick_wins.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-2 flex gap-3 overflow-x-auto">
          {analysis.quick_wins.map((w, i) => (
            <span key={i} className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">
              {i === 0 ? "⚡" : "→"} {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoDetailPanel({
  video, provider, onClose,
}: {
  video: Video; provider: AIProvider; onClose: () => void;
}) {
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeVideoSEO);
  const updateTagsFn = useServerFn(updateVideoTags);
  const session = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session
    : null;

  const [tags, setTags] = useState<string[]>([...video.tags]);
  const [newTag, setNewTag] = useState("");
  const [editDescription, setEditDescription] = useState(video.description);
  const [editTitle, setEditTitle] = useState(video.title);
  const [copied, setCopied] = useState<string | null>(null);

  const analysisQ = useQuery({
    queryKey: ["video-analysis", video.id, provider],
    queryFn: () => analyzeFn({
      data: {
        videoId: video.id, title: video.title, description: video.description,
        tags: video.tags, views: video.views, likes: video.likes,
        comments: video.comments, provider,
      },
    }),
    staleTime: 5 * 60_000,
  });

  const updateM = useMutation({
    mutationFn: () => updateTagsFn({
      data: {
        creatorId: session!.id,
        videoId: video.id,
        title: editTitle,
        description: editDescription,
        tags,
      },
    }),
    onSuccess: () => {
      toast.success("Vidéo mise à jour sur YouTube !");
      qc.invalidateQueries({ queryKey: ["yt-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase().replace(/\s+/g, " ");
    if (t && !tags.includes(t) && tags.length < 500) {
      setTags(prev => [...prev, t]);
      setNewTag("");
    }
  }
  function removeTag(t: string) { setTags(prev => prev.filter(x => x !== t)); }
  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const a = analysisQ.data;

  return (
    <div className="rounded-2xl border border-violet-300 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 border-b border-neutral-100 bg-gradient-to-r from-violet-50 to-pink-50">
        <img src={video.thumbnail} className="w-24 h-[54px] rounded-lg object-cover shrink-0 shadow-sm" alt="" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug line-clamp-2">{video.title}</p>
          <div className="flex gap-3 mt-1 text-xs text-neutral-500">
            <span><Eye className="h-3 w-3 inline mr-0.5" />{video.views.toLocaleString()}</span>
            <span><ThumbsUp className="h-3 w-3 inline mr-0.5" />{video.likes.toLocaleString()}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">

        {/* SEO Scores */}
        {analysisQ.isLoading && (
          <div className="flex items-center gap-2 text-sm text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            Analyse IA en cours…
          </div>
        )}
        {a && (
          <div className="space-y-4">
            {/* Global score */}
            <div className="flex items-center gap-3">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-sm ${SCORE_BG(a.overall_score)} ${SCORE_COLOR(a.overall_score)}`}>
                {a.overall_score}
              </div>
              <div>
                <div className="font-bold">Score SEO global</div>
                <div className="text-xs text-neutral-500">{a.top_opportunity}</div>
              </div>
              {a.estimated_views_boost && (
                <div className="ml-auto text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full">
                  {a.estimated_views_boost} de vues
                </div>
              )}
            </div>

            <div className="space-y-2">
              <ScoreBar score={a.title_score} label="Titre" />
              <ScoreBar score={a.tags_score} label="Tags" />
              <ScoreBar score={a.description_score} label="Description" />
            </div>

            {/* Quick wins */}
            {a.quick_wins.length > 0 && (
              <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 space-y-1.5">
                <div className="text-xs font-bold text-violet-700 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Quick wins
                </div>
                {a.quick_wins.map((w, i) => (
                  <div key={i} className="text-xs text-violet-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />{w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" /> Titre
              {a && <span className={`text-xs font-bold ${SCORE_COLOR(a.title_score)}`}>({a.title_score}/100)</span>}
            </Label>
            <button onClick={() => copyText(editTitle, "title")} className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1">
              {copied === "title" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              Copier
            </button>
          </div>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm" />
          {a?.title_suggestion && editTitle !== a.title_suggestion && (
            <button
              onClick={() => setEditTitle(a.title_suggestion)}
              className="w-full text-left text-xs p-2.5 rounded-lg border border-dashed border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <Sparkles className="h-3 w-3 inline mr-1" />
              Suggestion : <strong>{a.title_suggestion}</strong>
            </button>
          )}
        </div>

        {/* Tags editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-violet-500" /> Tags ({tags.length})
              {a && <span className={`text-xs font-bold ${SCORE_COLOR(a.tags_score)}`}>({a.tags_score}/100)</span>}
            </Label>
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-neutral-50 border min-h-[48px]">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
                {t}
                <button onClick={() => removeTag(t)} className="text-neutral-300 hover:text-red-500 transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Add tag input */}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
              placeholder="Ajouter un tag… (Entrée pour valider)"
              className="flex-1 text-xs h-8"
            />
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => addTag(newTag)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* AI suggested tags */}
          {a && (
            <div className="space-y-2">
              {a.tags_missing.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-red-500 font-semibold mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Tags manquants
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags_missing.map(t => (
                      <button key={t} onClick={() => addTag(t)}
                        className="text-xs px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1">
                        <Plus className="h-2.5 w-2.5" />{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {a.keywords_to_add.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-violet-500 font-semibold mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Mots clés recommandés
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.keywords_to_add.map(t => (
                      <button key={t} onClick={() => addTag(t)}
                        className="text-xs px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition-colors flex items-center gap-1">
                        <Plus className="h-2.5 w-2.5" />{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {a.tags_good.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-emerald-500 font-semibold mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Bons tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags_good.map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              Description
              {a && <span className={`text-xs font-bold ${SCORE_COLOR(a.description_score)}`}>({a.description_score}/100)</span>}
              {a?.description_missing && <span className="text-[10px] text-red-500 font-medium">(vide — impact majeur SEO)</span>}
            </Label>
            <button onClick={() => copyText(editDescription, "desc")} className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1">
              {copied === "desc" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              Copier
            </button>
          </div>
          <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
            rows={5} className="text-xs font-normal resize-none" placeholder="Description de la vidéo..." />
        </div>

        {/* Analyses détaillées */}
        {a && (
          <div className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-600 space-y-3">
            <div><strong className="text-neutral-800">Analyse titre :</strong> {a.full_title_analysis}</div>
            <div><strong className="text-neutral-800">Analyse tags :</strong> {a.full_tags_analysis}</div>
            <div><strong className="text-neutral-800">Analyse description :</strong> {a.full_description_analysis}</div>
          </div>
        )}

        {/* Save button */}
        {session?.hasYoutube && (
          <Button
            onClick={() => updateM.mutate()}
            disabled={updateM.isPending}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0 font-semibold gap-2"
          >
            {updateM.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Mise à jour sur YouTube…</>
              : <><CheckCircle2 className="h-4 w-4" /> Appliquer sur YouTube</>
            }
          </Button>
        )}
      </div>
    </div>
  );
}

// Refs to trigger analysis from outside VideoRow
const analyzeCallbacks = new Map<string, () => void>();

export default function SEOPage() {
  const session = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session
    : null;

  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState("");
  const [analyzingAll, setAnalyzingAll] = useState(false);

  const fetchVideosFn = useServerFn(fetchYoutubeVideos);
  const videosQ = useQuery({
    queryKey: ["yt-videos-seo", session?.id],
    queryFn: () => fetchVideosFn({ data: { creatorId: session!.id, maxResults: 50 } }),
    enabled: !!session?.id && !!session.hasYoutube,
  });

  const videos = (videosQ.data ?? []).filter(v =>
    !search || v.title.toLowerCase().includes(search.toLowerCase()),
  );

  function handleLogout() { localStorage.removeItem("creator_session"); window.location.href = "/"; }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm">SEO Optimizer</h1>
              <p className="text-xs text-neutral-400">Analysez et optimisez chaque vidéo avec l'IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              className="gap-1.5 h-8 text-xs"
              disabled={analyzingAll}
              onClick={() => {
                setAnalyzingAll(true);
                analyzeCallbacks.forEach(fn => fn());
                setTimeout(() => setAnalyzingAll(false), 3000);
              }}
            >
              {analyzingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Analyser toutes
            </Button>
            <AIProviderSelect value={provider} onChange={setProvider} />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-hidden">
          {!session?.hasYoutube ? (
            <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
              <TrendingUp className="h-16 w-16 mx-auto text-neutral-200" />
              <h2 className="text-xl font-bold">Connectez votre chaîne YouTube</h2>
              <p className="text-neutral-500 text-sm">L'optimiseur SEO analyse vos vidéos en temps réel depuis YouTube.</p>
              <Button onClick={() => window.location.href = "/onboarding"}
                className="bg-red-600 hover:bg-red-700 text-white border-0 gap-2">
                Connecter YouTube
              </Button>
            </div>
          ) : (
            <div className={`grid gap-5 h-full ${selectedVideo ? "grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
              {/* Video list */}
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Search + count */}
                <div className="flex items-center gap-3">
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher une vidéo…"
                    className="flex-1 h-9"
                  />
                  {videosQ.isLoading ? (
                    <span className="text-xs text-neutral-400 whitespace-nowrap flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 whitespace-nowrap">
                      {videos.length}{' '}{videos.length !== 1 ? 'vidéos' : 'vidéo'}
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => videosQ.refetch()} className="gap-1 h-9">
                    <RefreshCw className={`h-3.5 w-3.5 ${videosQ.isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                {videosQ.isLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border bg-white p-4 flex gap-4 animate-pulse">
                        <div className="w-36 h-[81px] rounded-xl bg-neutral-100 shrink-0" />
                        <div className="flex-1 space-y-3 py-1">
                          <div className="h-3 bg-neutral-100 rounded w-3/4" />
                          <div className="h-3 bg-neutral-100 rounded w-1/2" />
                          <div className="h-8 bg-neutral-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!videosQ.isLoading && videos.length === 0 && (
                  <div className="text-center py-16 text-neutral-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucune vidéo trouvée</p>
                  </div>
                )}

                {videos.map(video => (
                  <VideoRow
                    key={video.id}
                    video={video}
                    provider={provider}
                    onDetails={v => setSelectedVideo(prev => prev?.id === v.id ? null : v)}
                    isDetailsOpen={selectedVideo?.id === video.id}
                  />
                ))}
              </div>

              {/* Detail panel */}
              {selectedVideo && (
                <div className="overflow-y-auto">
                  <VideoDetailPanel
                    video={selectedVideo}
                    provider={provider}
                    onClose={() => setSelectedVideo(null)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
