import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Settings, Youtube, User, Lock, Bell, CreditCard, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCreator } from "@/lib/creator.server";
import { CreatorSidebar } from "@/components/creator-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";

type Session = { id: string; name: string | null; email: string; plan: string; hasYoutube?: boolean };

export const Route = createFileRoute("/creator-settings")({
  head: () => ({ meta: [{ title: "Paramètres — TubeMind" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("creator_session")) throw redirect({ to: "/creator-login" });
  },
  component: CreatorSettingsPage,
});

const PLANS = [
  { id: "free", name: "Free", price: "$0", features: ["2 analyses/mois", "Chrome extension", "Script AI (3/mois)"], current: true },
  { id: "creator", name: "Creator", price: "$19/mois", features: ["20 vidéos/mois", "Tag management complet", "Auto-optimize", "Competitor research", "Bulk update", "Upload manager"], current: false },
  { id: "pro", name: "Pro", price: "$49/mois", features: ["Illimité", "Tout Creator inclus", "Alertes temps réel", "Multi-chaînes", "API access", "Support prioritaire"], current: false },
];

export default function CreatorSettingsPage() {
  const session = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("creator_session") ?? "null") as Session : null;
  const getCreatorFn = useServerFn(getCreator);

  const creatorQ = useQuery({
    queryKey: ["creator-settings", session?.id],
    queryFn: () => getCreatorFn({ data: { id: session!.id } }),
    enabled: !!session?.id,
  });

  const [name, setName] = useState(session?.name ?? "");
  const [notifs, setNotifs] = useState({ email: true, tagAlerts: true, weeklyReport: true });

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:8080";
  const REDIRECT_URI = `${APP_URL}/api/auth/youtube/callback`;
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly")}&access_type=offline&prompt=consent&state=tubemind_youtube_connect:${session?.id}`;

  function saveName() {
    try {
      const s = JSON.parse(localStorage.getItem("creator_session") ?? "{}");
      s.name = name;
      localStorage.setItem("creator_session", JSON.stringify(s));
      toast.success("Nom mis à jour");
    } catch { toast.error("Erreur"); }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <CreatorSidebar session={session ?? {}} onLogout={() => { localStorage.removeItem("creator_session"); window.location.href = "/"; }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 gap-3 sticky top-0 z-10">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center">
            <Settings className="h-4 w-4 text-white" />
          </div>
          <div><h1 className="font-bold text-sm">Paramètres</h1>
          <p className="text-xs text-neutral-400">Gérez votre compte et vos intégrations</p></div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profil</TabsTrigger>
                <TabsTrigger value="youtube" className="gap-1.5"><Youtube className="h-3.5 w-3.5" /> YouTube</TabsTrigger>
                <TabsTrigger value="notifs" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
                <TabsTrigger value="plan" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Plan</TabsTrigger>
              </TabsList>

              {/* Profil */}
              <TabsContent value="profile" className="mt-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
                  <h3 className="font-semibold">Informations personnelles</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-2xl font-extrabold">
                      {(session?.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{session?.name}</p>
                      <p className="text-sm text-neutral-500">{session?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom complet</Label>
                    <div className="flex gap-2">
                      <Input value={name} onChange={e => setName(e.target.value)} className="flex-1" />
                      <Button onClick={saveName} variant="outline">Sauvegarder</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={session?.email ?? ""} disabled className="bg-neutral-50" />
                  </div>
                  <div className="border-t pt-5">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Changer le mot de passe</h4>
                    <div className="space-y-2">
                      <Input type="password" placeholder="Mot de passe actuel" />
                      <Input type="password" placeholder="Nouveau mot de passe" />
                      <Input type="password" placeholder="Confirmer le nouveau mot de passe" />
                      <Button className="bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0">Changer le mot de passe</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* YouTube */}
              <TabsContent value="youtube" className="mt-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
                  <h3 className="font-semibold">Connexion YouTube</h3>
                  {creatorQ.data?.youtube_channel_id ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        {creatorQ.data.youtube_channel_thumbnail && (
                          <img src={creatorQ.data.youtube_channel_thumbnail} className="h-12 w-12 rounded-full" alt="" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {creatorQ.data.youtube_channel_name}
                          </div>
                          <p className="text-sm text-neutral-500">{(creatorQ.data.youtube_subscribers ?? 0).toLocaleString()} abonnés</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => window.location.href = oauthUrl} variant="outline" className="gap-2">
                          <Youtube className="h-4 w-4 text-red-600" /> Reconnecter
                        </Button>
                        <Button variant="outline" className="gap-2 text-rose-600 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" /> Déconnecter
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-neutral-500">Connectez votre chaîne YouTube pour activer toutes les fonctionnalités.</p>
                      <Button onClick={() => window.location.href = oauthUrl}
                        className="bg-red-600 hover:bg-red-700 text-white border-0 gap-2 h-11">
                        <Youtube className="h-4 w-4" /> Connecter ma chaîne YouTube
                      </Button>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">Accès accordés</h4>
                    {["Lecture des statistiques","Modification des métadonnées (titre, tags, description)","Upload de vidéos","Lecture des abonnés"].map(a => (
                      <div key={a} className="flex items-center gap-2 text-sm text-neutral-600 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{a}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifs" className="mt-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
                  <h3 className="font-semibold">Préférences de notifications</h3>
                  {[
                    { key: "email", label: "Emails de récapitulatif", desc: "Recevez un rapport hebdomadaire de vos performances" },
                    { key: "tagAlerts", label: "Alertes tags concurrents", desc: "Soyez notifié quand un concurrent change ses tags" },
                    { key: "weeklyReport", label: "Rapport mensuel", desc: "Analyse complète de votre croissance chaque mois" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl border">
                      <div>
                        <div className="font-medium text-sm">{label}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{desc}</div>
                      </div>
                      <Switch checked={notifs[key as keyof typeof notifs]}
                        onCheckedChange={v => setNotifs(prev => ({...prev, [key]: v}))} />
                    </div>
                  ))}
                  <Button className="bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0">
                    Sauvegarder les préférences
                  </Button>
                </div>
              </TabsContent>

              {/* Plan */}
              <TabsContent value="plan" className="mt-4 space-y-4">
                {PLANS.map(plan => (
                  <div key={plan.id} className={`rounded-2xl border p-5 ${session?.plan === plan.id ? "border-violet-300 bg-violet-50" : "border-neutral-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-bold">{plan.name}</span>
                          {session?.plan === plan.id && (
                            <span className="ml-2 text-[10px] uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">Actuel</span>
                          )}
                        </div>
                        <span className="font-extrabold text-lg text-violet-700">{plan.price}</span>
                      </div>
                      {session?.plan !== plan.id && (
                        <Button size="sm" className="bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0">
                          Passer à {plan.name}
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
