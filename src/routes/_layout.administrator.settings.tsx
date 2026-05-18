import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, Save, Link2, Mail, Eye, Code2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  listSponsors, createSponsor, updateSponsor, deleteSponsor, syncSponsor,
} from "@/lib/sponsors.functions";
import { listEmailTemplates, upsertEmailTemplate } from "@/lib/mailgun.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Driver = "cake" | "everflow" | "hitpath";

const DEFAULT_BASES: Record<Driver, string> = {
  cake: "https://publisher.cx3ads.com/affiliates/api",
  everflow: "https://api.eflow.team",
  hitpath: "https://example.hitpath.com/api",
};

const TPL_META: Record<string, { label: string; badge?: string; badgeColor?: string; vars: string[] }> = {
  confirmation: { label: "Confirmation d'inscription", vars: ["{{confirm_url}}"] },
  welcome:      { label: "Email de bienvenue",         vars: ["{{email}}"] },
  relance_48h:  { label: "Relance 48h",   badge: "Auto · 48h",    badgeColor: "bg-blue-100 text-blue-700",   vars: ["{{confirm_url}}"] },
  relance_1w:   { label: "Relance 1 semaine", badge: "Auto · 7j", badgeColor: "bg-violet-100 text-violet-700", vars: ["{{confirm_url}}"] },
  relance_15d:  { label: "Relance 15 jours", badge: "Auto · 15j", badgeColor: "bg-orange-100 text-orange-700", vars: ["{{confirm_url}}"] },
  relance_1m:   { label: "Relance 1 mois",   badge: "Auto · 30j", badgeColor: "bg-rose-100 text-rose-700",   vars: ["{{confirm_url}}"] },
};

const TPL_ORDER = ["confirmation", "welcome", "relance_48h", "relance_1w", "relance_15d", "relance_1m"];

export const Route = createFileRoute("/_layout/administrator/settings")({
  head: () => ({ meta: [{ title: "Settings — PipeSend" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();

  // Sponsors
  const fetchSponsors = useServerFn(listSponsors);
  const createFn = useServerFn(createSponsor);
  const updateFn = useServerFn(updateSponsor);
  const deleteFn = useServerFn(deleteSponsor);
  const syncFn = useServerFn(syncSponsor);
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);

  const sponsorsQ = useQuery({ queryKey: ["sponsors"], queryFn: () => fetchSponsors() });

  const syncM = useMutation({
    mutationFn: (id: string) => syncFn({ data: { id } }),
    onSuccess: (r) => { toast.success(`Synchronisé : ${r.total} offres`); qc.invalidateQueries({ queryKey: ["sponsors"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["sponsors"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const createM = useMutation({
    mutationFn: (v: Parameters<typeof createFn>[0]["data"]) => createFn({ data: v }),
    onSuccess: () => { toast.success("Sponsor ajouté"); setSponsorDialogOpen(false); qc.invalidateQueries({ queryKey: ["sponsors"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: (v: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Sauvegardé"); qc.invalidateQueries({ queryKey: ["sponsors"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Email templates
  const fetchTpl = useServerFn(listEmailTemplates);
  const saveTpl = useServerFn(upsertEmailTemplate);
  const templatesQ = useQuery({ queryKey: ["email-templates"], queryFn: () => fetchTpl() });

  const [activeKey, setActiveKey] = useState("confirmation");
  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplHtml, setTplHtml] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const t = templatesQ.data?.find((x) => x.key === activeKey);
    if (t) { setTplName(t.name); setTplSubject(t.subject); setTplHtml(t.html); setPreview(false); }
    else { setTplName(""); setTplSubject(""); setTplHtml(""); }
  }, [activeKey, templatesQ.data]);

  const saveM = useMutation({
    mutationFn: () => saveTpl({ data: { key: activeKey, name: tplName, subject: tplSubject, html: tplHtml } }),
    onSuccess: () => { toast.success("Template enregistré"); qc.invalidateQueries({ queryKey: ["email-templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewHtml = tplHtml.replace(/\{\{confirm_url\}\}/g, "https://ton-site.com/newsletter/confirm?token=DEMO");
  const meta = TPL_META[activeKey];

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Sponsors, emails système et templates automatiques</p>
      </div>

      {/* ═══ SECTION : Emails système ═══ */}
      <section className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-5 border-b bg-gradient-to-r from-violet-50 to-pink-50">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            <div>
              <div className="font-semibold">Emails système</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirmation, bienvenue et relances automatiques — éditez le HTML et prévisualisez en direct.
              </p>
            </div>
          </div>
        </div>

        <div className="flex divide-x min-h-[560px]">
          {/* Sidebar templates */}
          <div className="w-52 shrink-0 p-3 space-y-1 bg-muted/20">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 py-1">Inscription</div>
            {["confirmation", "welcome"].map((key) => (
              <TemplateTab key={key} tplKey={key} active={activeKey === key} onClick={() => setActiveKey(key)} />
            ))}
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 py-1 pt-3 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Relances auto
            </div>
            {["relance_48h", "relance_1w", "relance_15d", "relance_1m"].map((key) => (
              <TemplateTab key={key} tplKey={key} active={activeKey === key} onClick={() => setActiveKey(key)} />
            ))}
          </div>

          {/* Éditeur */}
          <div className="flex-1 p-5 space-y-4">
            {/* En-tête template actif */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{meta?.label ?? activeKey}</span>
                {meta?.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.badgeColor}`}>
                    {meta.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => setPreview(v => !v)} disabled={!tplHtml}>
                  {preview ? <Code2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {preview ? "Éditer" : "Aperçu"}
                </Button>
                <Button size="sm" className="h-7 gap-1.5" onClick={() => saveM.mutate()} disabled={!tplHtml || saveM.isPending}>
                  {saveM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Sauvegarder
                </Button>
              </div>
            </div>

            {/* Relance info */}
            {activeKey.startsWith("relance_") && (
              <div className="rounded-lg border bg-blue-50 border-blue-200 p-3 text-xs text-blue-800">
                <strong className="flex items-center gap-1"><Clock className="h-3 w-3" /> Envoi automatique</strong>
                <p className="mt-1">
                  {activeKey === "relance_48h" && "Envoyé 48h après l'inscription si le subscriber n'a pas encore confirmé."}
                  {activeKey === "relance_1w"  && "Envoyé 7 jours après l'inscription si toujours non confirmé."}
                  {activeKey === "relance_15d" && "Envoyé 15 jours après l'inscription si toujours non confirmé."}
                  {activeKey === "relance_1m"  && "Envoyé 30 jours après l'inscription — dernière relance automatique."}
                  {" "}Le cron tourne tous les jours à 9h00 UTC.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom interne</Label>
                <Input value={tplName} onChange={e => setTplName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sujet de l'email</Label>
                <Input value={tplSubject} onChange={e => setTplSubject(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">HTML</Label>
                {preview ? (
                  <iframe srcDoc={previewHtml} title="preview-mobile" sandbox="allow-same-origin"
                    className="w-full h-80 rounded border bg-white lg:hidden" />
                ) : (
                  <Textarea value={tplHtml} onChange={e => setTplHtml(e.target.value)}
                    className="font-mono text-xs h-80 resize-none" placeholder="Collez votre HTML ici…" />
                )}
              </div>
              <div className="space-y-1.5 hidden lg:block">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Aperçu temps réel</Label>
                <iframe srcDoc={previewHtml} title="preview-live" sandbox="allow-same-origin"
                  className="w-full h-80 rounded border bg-white" />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Variables : {(meta?.vars ?? ["{{confirm_url}}"]).map(v => (
                <code key={v} className="bg-muted px-1.5 py-0.5 rounded mx-1">{v}</code>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION : Sponsors ═══ */}
      <section className="rounded-2xl border bg-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">Sponsors & drivers API</div>
            <p className="text-xs text-muted-foreground mt-0.5">CAKE, Everflow et plus.</p>
          </div>
          <Dialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Ajouter un sponsor</Button>
            </DialogTrigger>
            <AddSponsorDialog onSubmit={(v) => createM.mutate(v)} loading={createM.isPending} />
          </Dialog>
        </div>
        <div className="divide-y">
          {sponsorsQ.isLoading && <div className="p-5 text-sm text-muted-foreground">Chargement...</div>}
          {sponsorsQ.data?.length === 0 && (
            <div className="p-8 text-sm text-muted-foreground text-center">Aucun sponsor.</div>
          )}
          {sponsorsQ.data?.map((s) => (
            <SponsorRowEditor key={s.id} sponsor={s}
              onSync={() => syncM.mutate(s.id)}
              onDelete={() => { if (confirm(`Supprimer ${s.name} ?`)) deleteM.mutate(s.id); }}
              onSave={(v) => updateM.mutate({ id: s.id, ...v })}
              syncing={syncM.isPending} saving={updateM.isPending}
            />
          ))}
        </div>
      </section>

      {/* ═══ SECTION : Variables tracking ═══ */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" /> Variables de tracking links
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {[["[campaign]","ID campagne email"],["[offer]","ID offre"],["[sponsor]","ID sponsor"],["[list]","ID liste"],["[email]","ID abonné"],["[user]","ID utilisateur"]].map(([k,v]) => (
            <div key={k} className="rounded-lg border bg-muted/30 px-2.5 py-1.5">
              <code className="text-primary font-mono">{k}</code>
              <div className="text-muted-foreground text-[11px]">{v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplateTab({ tplKey, active, onClick }: { tplKey: string; active: boolean; onClick: () => void }) {
  const meta = TPL_META[tplKey];
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-muted-foreground"
      }`}>
      <div className="truncate">{meta?.label ?? tplKey}</div>
      {meta?.badge && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 inline-block ${meta.badgeColor}`}>
          {meta.badge}
        </span>
      )}
    </button>
  );
}

function SponsorRowEditor({ sponsor, onSync, onDelete, onSave, syncing, saving }: {
  sponsor: { id: string; name: string; driver: string; api_base: string; affiliate_id: string; tracking_link_template: string | null; last_sync_at: string | null; offer_count: number };
  onSync: () => void; onDelete: () => void;
  onSave: (v: { name?: string; api_base?: string; api_key?: string; affiliate_id?: string; tracking_link_template?: string | null }) => void;
  syncing: boolean; saving: boolean;
}) {
  const [form, setForm] = useState({
    name: sponsor.name, api_base: sponsor.api_base,
    affiliate_id: sponsor.affiliate_id, tracking_link_template: sponsor.tracking_link_template ?? "", api_key: "",
  });
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">{sponsor.driver}</span>
          <span className="font-semibold">{sponsor.name}</span>
          <span className="text-xs text-muted-foreground">
            {sponsor.offer_count} offres · {sponsor.last_sync_at ? `sync ${new Date(sponsor.last_sync_at).toLocaleString()}` : "jamais sync"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Nom</Label>
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="space-y-1"><Label className="text-xs">Affiliate ID</Label>
          <Input value={form.affiliate_id} onChange={e => setForm({...form, affiliate_id: e.target.value})} /></div>
        <div className="space-y-1 md:col-span-2"><Label className="text-xs">API Base URL</Label>
          <Input value={form.api_base} onChange={e => setForm({...form, api_base: e.target.value})} /></div>
        <div className="space-y-1 md:col-span-2"><Label className="text-xs">Nouvelle API Key <span className="font-normal text-muted-foreground">(vide = inchangée)</span></Label>
          <Input type="password" value={form.api_key} placeholder="••••••••" onChange={e => setForm({...form, api_key: e.target.value})} /></div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" className="h-8 gap-1.5" disabled={saving}
          onClick={() => onSave({ name: form.name, api_base: form.api_base, affiliate_id: form.affiliate_id, tracking_link_template: form.tracking_link_template || null, ...(form.api_key ? { api_key: form.api_key } : {}) })}>
          <Save className="h-3.5 w-3.5" /> Sauvegarder
        </Button>
      </div>
    </div>
  );
}

function AddSponsorDialog({ onSubmit, loading }: {
  onSubmit: (v: { name: string; driver: Driver; api_base: string; api_key: string; affiliate_id: string }) => void;
  loading: boolean;
}) {
  const [driver, setDriver] = useState<Driver>("cake");
  const [form, setForm] = useState({ name: "", api_base: DEFAULT_BASES.cake, api_key: "", affiliate_id: "" });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Ajouter un sponsor</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Nom</Label>
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="CX3ADS" /></div>
        <div className="space-y-1.5"><Label>Driver</Label>
          <Select value={driver} onValueChange={v => { setDriver(v as Driver); setForm({...form, api_base: DEFAULT_BASES[v as Driver]}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cake">CAKE</SelectItem>
              <SelectItem value="everflow">Everflow</SelectItem>
              <SelectItem value="hitpath" disabled>HitPath (bientôt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>API Base URL</Label>
          <Input value={form.api_base} onChange={e => setForm({...form, api_base: e.target.value})} /></div>
        <div className="space-y-1.5"><Label>API Key</Label>
          <Input type="password" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} /></div>
        <div className="space-y-1.5"><Label>Affiliate ID</Label>
          <Input value={form.affiliate_id} onChange={e => setForm({...form, affiliate_id: e.target.value})} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ name: form.name || driver.toUpperCase(), driver, api_base: form.api_base, api_key: form.api_key, affiliate_id: form.affiliate_id })}
          disabled={loading || !form.api_key}>
          {loading ? "Ajout..." : "Ajouter"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
