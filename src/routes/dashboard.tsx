import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users, Eye, Play, TrendingUp, ThumbsUp, MessageCircle,
  Youtube, Sparkles, ArrowRight, Zap, ChevronRight, Tag, Search,
  Upload, Settings, RefreshCw,
} from "lucide-react";
import { fetchYoutubeChannel, fetchYoutubeVideos } from "@/lib/creator.server";
import { useCreatorSession } from "@/hooks/use-creator-session";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { session, logout } = useCreatorSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchChannelFn = useServerFn(fetchYoutubeChannel);
  const fetchVideosFn = useServerFn(fetchYoutubeVideos);

  const hasYoutube = session?.hasYoutube ?? false;

  // Only fetch YouTube data if channel is connected
  const channelQ = useQuery({
    queryKey: ["yt-channel", session?.id],
    queryFn: () => fetchChannelFn({ data: { creatorId: session!.id } }),
    enabled: !!session?.id && hasYoutube,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const videosQ = useQuery({
    queryKey: ["yt-videos", session?.id],
    queryFn: () => fetchVideosFn({ data: { creatorId: session!.id, maxResults: 8 } }),
    enabled: !!session?.id && hasYoutube,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const channel = channelQ.data;
  const videos = videosQ.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={logout} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="text-sm font-semibold text-neutral-700">
            Bonjour, {session?.name?.split(" ")[0] ?? "là"} 👋
          </div>
          <div className="flex items-center gap-3">
            {!hasYoutube && (
              <Link to="/onboarding">
                <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white border-0 text-xs">
                  <Youtube className="h-3.5 w-3.5" /> Connecter YouTube
                </Button>
              </Link>
            )}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
              {(session?.name ?? "?")[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* No YouTube connected banner */}
          {!hasYoutube && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 shadow-lg">
              <div aria-hidden className="absolute right-0 top-0 h-full w-64 opacity-10">
                <Youtube className="h-full w-full" />
              </div>
              <div className="relative flex items-center justify-between gap-6">
                <div>
                  <div className="text-sm font-medium opacity-80 mb-1">Étape suivante</div>
                  <h2 className="text-xl font-extrabold">Connectez votre chaîne YouTube</h2>
                  <p className="text-sm opacity-80 mt-1 max-w-md">
                    Donnez accès à TubeMind pour analyser vos performances, optimiser vos vidéos et surveiller vos concurrents.
                  </p>
                </div>
                <Link to="/onboarding" className="shrink-0">
                  <Button className="bg-white text-red-600 hover:bg-white/90 border-0 font-bold gap-2 h-11 px-6 shadow-lg">
                    <Youtube className="h-4 w-4" /> Connecter maintenant <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Channel overview */}
          {hasYoutube && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-5">
                {channel ? (
                  <img
                    src={(channel.thumbnail as Record<string, unknown>)?.url as string}
                    alt={channel.name}
                    className="h-16 w-16 rounded-full ring-2 ring-violet-100"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-200 to-pink-200 animate-pulse" />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-extrabold">{channel?.name ?? session?.channelName ?? "Votre chaîne"}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {(channel?.subscribers ?? 0).toLocaleString()} abonnés</span>
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {(channel?.views ?? 0).toLocaleString()} vues totales</span>
                    <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5" /> {channel?.videos ?? 0} vidéos</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" /> Paramètres chaîne
                </Button>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Abonnés",       value: hasYoutube ? (channel?.subscribers ?? "—").toLocaleString() : "—", icon: Users,    trend: "+2.4%", color: "violet" },
              { label: "Vues totales",  value: hasYoutube ? (channel?.views ?? "—").toLocaleString()       : "—", icon: Eye,      trend: "+5.1%", color: "blue" },
              { label: "Vidéos",        value: hasYoutube ? (channel?.videos ?? "—")                       : "—", icon: Play,     trend: null,    color: "pink" },
              { label: "Vues moy./vidéo", value: hasYoutube && channel ? Math.round(channel.views / Math.max(channel.videos, 1)).toLocaleString() : "—", icon: TrendingUp, trend: "+8.3%", color: "emerald" },
            ].map(({ label, value, icon: Icon, trend, color }) => (
              <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${
                  color === "violet" ? "bg-violet-100 text-violet-600" :
                  color === "blue"   ? "bg-blue-100 text-blue-600" :
                  color === "pink"   ? "bg-pink-100 text-pink-600" :
                  "bg-emerald-100 text-emerald-600"}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-2xl font-extrabold">{value}</div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                  {label}
                  {trend && <span className="text-emerald-600 font-medium">{trend}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-600" /> Actions rapides
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Sparkles,   label: "Générer un script",     desc: "IA écrit pour vous", color: "from-violet-500 to-violet-600" },
                { icon: Tag,        label: "Optimiser les tags",     desc: "Gap analysis",        color: "from-blue-500 to-blue-600" },
                { icon: Search,     label: "Analyser un concurrent", desc: "Espionnage légal",    color: "from-pink-500 to-rose-600" },
                { icon: Upload,     label: "Uploader une vidéo",     desc: "Direct sur YouTube",  color: "from-emerald-500 to-teal-600" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <button key={label}
                  className="group rounded-xl border border-neutral-200 p-4 text-left hover:border-violet-300 hover:shadow-md transition-all">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Videos */}
          {hasYoutube && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="font-semibold flex items-center gap-2">
                  <Play className="h-4 w-4 text-violet-600" /> Vidéos récentes
                </div>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  Voir toutes <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {videosQ.isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-28 h-16 rounded-lg bg-neutral-100 shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-neutral-100 rounded w-3/4" />
                        <div className="h-3 bg-neutral-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!videosQ.isLoading && videos.length === 0 && (
                <div className="text-center py-10 text-neutral-400 text-sm">
                  Aucune vidéo trouvée ou accès insuffisant.
                </div>
              )}

              <div className="space-y-3">
                {videos.map((v) => (
                  <div key={v.id} className="flex gap-4 p-3 rounded-xl hover:bg-neutral-50 transition-colors group">
                    <div className="w-28 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
                      {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate group-hover:text-violet-700 transition-colors">{v.title}</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        {new Date(v.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {v.views.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {v.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {v.comments.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Tag className="h-3 w-3" /> Optimiser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coming soon modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Sparkles, title: "Script AI", desc: "Générez votre prochain script en 30 secondes avec Claude.", color: "from-violet-500 to-violet-600" },
              { icon: Search,   title: "Competitor Research", desc: "Analysez les stratégies de vos concurrents.", color: "from-blue-500 to-cyan-600" },
              { icon: RefreshCw, title: "Auto-Optimize", desc: "Vos vidéos optimisées automatiquement chaque semaine.", color: "from-pink-500 to-rose-600" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="relative rounded-2xl border border-neutral-200 bg-white p-5 overflow-hidden">
                <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-10`} />
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow mb-4`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold mb-1">{title}</div>
                <div className="text-xs text-neutral-500 mb-4">{desc}</div>
                <Button size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0 hover:opacity-90">
                  Accéder <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
