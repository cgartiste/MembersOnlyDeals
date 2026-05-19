import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateCalendar } from "@/lib/claude.server";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";

const TYPE_COLORS: Record<string, string> = {
  educational: "bg-blue-100 text-blue-700",
  entertaining: "bg-pink-100 text-pink-700",
  storytelling: "bg-purple-100 text-purple-700",
  tutorial: "bg-emerald-100 text-emerald-700",
  vlog: "bg-amber-100 text-amber-700",
};

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Content Calendar — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: CalendarPage,
});

export default function CalendarPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") : null;
  const genFn = useServerFn(generateCalendar);
  const [form, setForm] = useState({ niche: "", frequency: "2/week" as const, month: "" });
  const [result, setResult] = useState<Awaited<ReturnType<typeof genFn>> | null>(null);

  const m = useMutation({
    mutationFn: () => genFn({ data: form }),
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  const weeks = result ? [1, 2, 3, 4] : [];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Content Calendar</h1>
            <p className="text-xs text-neutral-400">Planifiez votre contenu pour le mois avec l'IA</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label>Votre niche *</Label>
                  <Input value={form.niche} onChange={e => setForm({...form, niche: e.target.value})} placeholder="Finance, Gaming, Lifestyle..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Fréquence de publication</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v as typeof form.frequency})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1/week">1 vidéo / semaine</SelectItem>
                      <SelectItem value="2/week">2 vidéos / semaine</SelectItem>
                      <SelectItem value="3/week">3 vidéos / semaine</SelectItem>
                      <SelectItem value="daily">1 vidéo / jour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mois</Label>
                  <Input value={form.month} onChange={e => setForm({...form, month: e.target.value})} placeholder="Juin 2025" />
                </div>
                <Button onClick={() => m.mutate()} disabled={!form.niche || m.isPending}
                  className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 font-semibold gap-2">
                  {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {m.isPending ? "Génération…" : "Générer le calendrier"}
                </Button>
              </div>
            </div>

            {m.isPending && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-16 text-center">
                <Loader2 className="h-10 w-10 mx-auto mb-3 text-violet-500 animate-spin" />
                <p className="text-sm text-violet-700 font-medium">Claude planifie votre contenu pour le mois…</p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-white px-4 py-1 text-sm font-bold">
                    {result.monthly_theme}
                  </div>
                  <div className="flex gap-2">
                    {result.tips.map((t, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">💡 {t}</span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {weeks.map(week => {
                    const weekVideos = result.videos.filter(v => v.week === week);
                    return (
                      <div key={week} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-600 to-pink-500 text-white px-4 py-2.5 text-sm font-bold">
                          Semaine {week}
                        </div>
                        <div className="p-3 space-y-3">
                          {weekVideos.length === 0 ? (
                            <p className="text-xs text-neutral-400 text-center py-4">Pas de vidéo cette semaine</p>
                          ) : weekVideos.map((v, i) => (
                            <div key={i} className="rounded-xl border border-neutral-100 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-neutral-500">{v.day}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[v.type] ?? "bg-neutral-100 text-neutral-600"}`}>
                                  {v.type}
                                </span>
                              </div>
                              <p className="text-sm font-medium leading-snug">{v.topic}</p>
                              <p className="text-xs text-violet-600 italic">{v.hook_idea}</p>
                              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                <span>🖼️ {v.thumbnail_concept}</span>
                                <span>👁️ {v.estimated_views}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
