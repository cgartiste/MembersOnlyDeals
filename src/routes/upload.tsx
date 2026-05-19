import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Youtube, CheckCircle2, FileVideo, Image, Globe, Lock, EyeOff, CalendarDays, Sparkles } from "lucide-react";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload Manager — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: UploadPage,
});

export default function UploadPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") : null;
  const [step, setStep] = useState<"file" | "meta" | "publish">("file");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", tags: "", visibility: "public",
    scheduleDate: "", scheduleTime: "", madeForKids: false,
  });
  const [uploaded, setUploaded] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) { setFile(f); setStep("meta"); }
  }

  function handlePublish() {
    setUploaded(true);
  }

  if (uploaded) {
    return (
      <div className="min-h-screen bg-neutral-50 flex">
        <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold">Vidéo publiée !</h2>
            <p className="text-neutral-500 text-sm">{form.title} est maintenant sur YouTube</p>
            <Button onClick={() => { setUploaded(false); setFile(null); setStep("file"); setForm({title:"",description:"",tags:"",visibility:"public",scheduleDate:"",scheduleTime:"",madeForKids:false}); }}
              className="bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0">
              Uploader une autre vidéo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Upload className="h-4 w-4 text-white" />
          </div>
          <div><h1 className="font-bold text-sm">Upload Manager</h1>
          <p className="text-xs text-neutral-400">Publiez directement sur YouTube avec métadonnées IA</p></div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[{key:"file",label:"Fichier"},{key:"meta",label:"Métadonnées"},{key:"publish",label:"Publication"}].map(({key,label}, i) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step === key || (key === "file" && file) || (key === "meta" && step === "publish") ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white" : "bg-neutral-200 text-neutral-500"}`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm font-medium ${step === key ? "text-violet-700" : "text-neutral-400"}`}>{label}</span>
                  {i < 2 && <div className="w-12 h-0.5 bg-neutral-200 mx-1" />}
                </div>
              ))}
            </div>

            {step === "file" && (
              <div
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById("video-input")?.click()}
                className="rounded-3xl border-2 border-dashed border-neutral-300 bg-white p-20 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
              >
                <input id="video-input" type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setStep("meta"); } }} />
                <FileVideo className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-xl font-bold mb-2">Déposez votre vidéo ici</h3>
                <p className="text-neutral-500 text-sm">MP4, MOV, AVI — Jusqu'à 256 GB</p>
                <Button className="mt-6 bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0">
                  Choisir un fichier
                </Button>
              </div>
            )}

            {(step === "meta" || step === "publish") && file && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border">
                      <FileVideo className="h-8 w-8 text-neutral-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-neutral-400">{(file.size / 1_000_000).toFixed(1)} MB</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Titre *</Label>
                        <button className="text-xs text-violet-600 flex items-center gap-1 hover:underline">
                          <Sparkles className="h-3 w-3" /> Générer avec IA
                        </button>
                      </div>
                      <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Titre de votre vidéo (max 100 chars)" maxLength={100} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Description</Label>
                        <button className="text-xs text-violet-600 flex items-center gap-1 hover:underline">
                          <Sparkles className="h-3 w-3" /> Générer avec IA
                        </button>
                      </div>
                      <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={6} placeholder="Description de la vidéo..." />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Tags (séparés par virgules)</Label>
                      <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="tag1, tag2, tag3..." />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
                    <h3 className="font-semibold">Paramètres de publication</h3>

                    <div className="space-y-1.5">
                      <Label>Visibilité</Label>
                      <Select value={form.visibility} onValueChange={v => setForm({...form, visibility: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Publique</span></SelectItem>
                          <SelectItem value="unlisted"><span className="flex items-center gap-2"><EyeOff className="h-3.5 w-3.5" /> Non répertoriée</span></SelectItem>
                          <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Privée</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Planifier la publication</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={form.scheduleDate} onChange={e => setForm({...form, scheduleDate: e.target.value})} />
                        <Input type="time" value={form.scheduleTime} onChange={e => setForm({...form, scheduleTime: e.target.value})} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <div className="text-sm font-medium">Contenu pour enfants</div>
                        <div className="text-xs text-neutral-400">Made for Kids (YouTube COPPA)</div>
                      </div>
                      <Switch checked={form.madeForKids} onCheckedChange={v => setForm({...form, madeForKids: v})} />
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                      <Label>Miniature personnalisée</Label>
                      <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:border-violet-400 transition-colors">
                        <Image className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                        <p className="text-xs text-neutral-400">Glissez une image ou cliquez</p>
                        <p className="text-[10px] text-neutral-300 mt-1">1280×720px recommandé</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handlePublish} disabled={!form.title}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white border-0 font-bold gap-2 text-base">
                    <Youtube className="h-5 w-5" />
                    {form.scheduleDate ? "Planifier sur YouTube" : "Publier maintenant"}
                  </Button>
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
