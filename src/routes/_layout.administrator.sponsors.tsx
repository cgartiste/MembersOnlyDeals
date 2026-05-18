import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, RefreshCw, Trash2, Search, Briefcase, MousePointerClick, TrendingUp, DollarSign, Send, Eye, Code2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  listSponsors,
  getSponsorOffers,
  createSponsor,
  deleteSponsor,
  syncSponsor,
  getOfferRaw,
  saveOfferDetails,
} from "@/lib/sponsors.functions";
import { sendSponsorOffer } from "@/lib/mailgun.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_layout/administrator/sponsors")({
  head: () => ({ meta: [{ title: "Sponsors — PipeSend" }] }),
  component: SponsorsPage,
});

function SponsorsPage() {
  const qc = useQueryClient();
  const fetchSponsors = useServerFn(listSponsors);
  const fetchOffers = useServerFn(getSponsorOffers);
  const createFn = useServerFn(createSponsor);
  const deleteFn = useServerFn(deleteSponsor);
  const syncFn = useServerFn(syncSponsor);
  const promoteFn = useServerFn(sendSponsorOffer);
  const getRawFn = useServerFn(getOfferRaw);
  const saveFn = useServerFn(saveOfferDetails);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [promoteOffer, setPromoteOffer] = useState<{ id: string; name: string | null } | null>(null);
  const [detailOffer, setDetailOffer] = useState<{
    id: string; name: string | null; offer_id: string;
    payout_display: string | null; tracking_link: string | null; html_creative: string | null;
  } | null>(null);

  const sponsorsQ = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => fetchSponsors(),
  });

  const activeId = selectedId ?? sponsorsQ.data?.[0]?.id ?? null;

  const offersQ = useQuery({
    queryKey: ["sponsor-offers", activeId, search],
    queryFn: () => fetchOffers({ data: { sponsorId: activeId!, search } }),
    enabled: !!activeId,
  });

  const createM = useMutation({
    mutationFn: (input: {
      name: string;
      driver: "cake" | "everflow" | "hitpath" | "adcombo";
      api_base: string;
      api_key: string;
      affiliate_id: string;
    }) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("Sponsor ajouté");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncM = useMutation({
    mutationFn: (id: string) => syncFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Synchronisé : ${r.total} offres`);
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      qc.invalidateQueries({ queryKey: ["sponsor-offers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sponsor supprimé");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteM = useMutation({
    mutationFn: (v: { offerRowId: string; from: string; to: string; subject?: string }) =>
      promoteFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`Offre envoyée à ${r.recipients} destinataire(s)`);
      setPromoteOffer(null);
      qc.invalidateQueries({ queryKey: ["monthly-income"] });
      qc.invalidateQueries({ queryKey: ["mg-recent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeSponsor = sponsorsQ.data?.find((s) => s.id === activeId);
  const activeOffersCount = activeSponsor?.offer_count ?? 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos comptes affiliés et synchronisez les offres
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter un sponsor
            </Button>
          </DialogTrigger>
          <AddSponsorDialog
            onSubmit={(v) => createM.mutate(v)}
            loading={createM.isPending}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Offres actives" value={activeOffersCount} icon={Briefcase} tint="violet" />
        <StatCard label="Clics 30j" value={0} icon={MousePointerClick} tint="green" />
        <StatCard label="Conversions" value={0} icon={TrendingUp} tint="orange" />
        <StatCard label="Revenus 30j" value="$0" icon={DollarSign} tint="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-2xl border bg-card p-3 space-y-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Comptes ({sponsorsQ.data?.length ?? 0})
          </div>
          {sponsorsQ.isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Chargement...</div>
          )}
          {sponsorsQ.data?.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Aucun sponsor pour l'instant
            </div>
          )}
          {sponsorsQ.data?.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-lg p-3 transition-colors ${
                  active ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{s.name}</div>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {s.driver}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  ID {s.affiliate_id} · {s.offer_count} offres
                </div>
                {active && (
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        syncM.mutate(s.id);
                      }}
                      disabled={syncM.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 ${syncM.isPending ? "animate-spin" : ""}`} />
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 gap-1 text-xs text-rose-600 hover:text-rose-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer ${s.name} ?`)) deleteM.mutate(s.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">
                {activeSponsor?.name ?? "Aucun sponsor sélectionné"}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeSponsor?.last_sync_at
                  ? `Dernière sync : ${new Date(activeSponsor.last_sync_at).toLocaleString()}`
                  : "Jamais synchronisé"}
              </div>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une offre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!activeId && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Ajoutez un sponsor pour voir ses offres
                  </TableCell>
                </TableRow>
              )}
              {activeId && offersQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Chargement...
                  </TableCell>
                </TableRow>
              )}
              {activeId && offersQ.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Aucune offre — lancez une sync
                  </TableCell>
                </TableRow>
              )}
              {offersQ.data?.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.offer_id}</TableCell>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.vertical ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {o.payout_display ?? (o.payout ? `$${o.payout}` : "—")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                        o.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {o.status ?? "unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1 text-xs"
                        onClick={() =>
                          setDetailOffer({
                            id: o.id,
                            name: o.name,
                            offer_id: o.offer_id,
                            payout_display: o.payout_display,
                            tracking_link: o.tracking_link,
                            html_creative: o.html_creative,
                          })
                        }
                      >
                        <Eye className="h-3 w-3" /> Détail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1 text-xs"
                        onClick={() => setPromoteOffer({ id: o.id, name: o.name })}
                      >
                        <Send className="h-3 w-3" /> Promouvoir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!promoteOffer} onOpenChange={(o) => !o && setPromoteOffer(null)}>
        {promoteOffer && (
          <PromoteDialog
            offer={promoteOffer}
            loading={promoteM.isPending}
            onSubmit={(v) => promoteM.mutate({ offerRowId: promoteOffer.id, ...v })}
          />
        )}
      </Dialog>

      <Dialog open={!!detailOffer} onOpenChange={(o) => { if (!o) { setDetailOffer(null); qc.invalidateQueries({ queryKey: ["sponsor-offers"] }); } }}>
        {detailOffer && (
          <OfferDetailDialog
            offer={detailOffer}
            getRawFn={getRawFn}
            saveFn={saveFn}
          />
        )}
      </Dialog>
    </div>
  );
}

function PromoteDialog({
  offer,
  onSubmit,
  loading,
}: {
  offer: { id: string; name: string | null };
  onSubmit: (v: { from: string; to: string; subject?: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    from: "noreply@global-server.net",
    to: "",
    subject: offer.name ?? "",
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Promouvoir : {offer.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Destinataires (séparés par virgules)</Label>
          <Textarea
            rows={3}
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="a@x.com, b@y.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sujet</Label>
          <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <p className="text-xs text-muted-foreground">
          Le creative HTML de l'offre sera envoyé via Mailgun (domaine global-server.net).
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.to}>
          {loading ? "Envoi..." : "Envoyer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddSponsorDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (v: {
    name: string;
    driver: "cake" | "everflow" | "hitpath" | "adcombo";
    api_base: string;
    api_key: string;
    affiliate_id: string;
  }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<{
    name: string;
    driver: "cake" | "everflow" | "hitpath" | "adcombo";
    api_base: string;
    api_key: string;
    affiliate_id: string;
  }>({
    name: "CX3ADS",
    driver: "cake",
    api_base: "https://publisher.cx3ads.com/affiliates/api",
    api_key: "",
    affiliate_id: "10735",
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Ajouter un sponsor</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Driver</Label>
          <Select
            value={form.driver}
            onValueChange={(v: "cake" | "everflow" | "hitpath" | "adcombo") => {
              const presets: Record<typeof v, { api_base: string; affiliate_id?: string }> = {
                cake: { api_base: "https://publisher.cx3ads.com/affiliates/api", affiliate_id: "10735" },
                everflow: { api_base: "https://api.eflow.team" },
                hitpath: { api_base: "" },
                adcombo: { api_base: "https://api.adcombo.com" },
              };
              setForm({
                ...form,
                driver: v,
                api_base: presets[v].api_base || form.api_base,
                affiliate_id: presets[v].affiliate_id ?? form.affiliate_id,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cake">CAKE</SelectItem>
              <SelectItem value="everflow">Everflow</SelectItem>
              <SelectItem value="adcombo">AdCombo</SelectItem>
              <SelectItem value="hitpath" disabled>
                HitPath (bientôt)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>API Base URL</Label>
          <Input
            value={form.api_base}
            onChange={(e) => setForm({ ...form, api_base: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>API Key</Label>
          <Input
            type="password"
            value={form.api_key}
            placeholder="Votre clé affilié CAKE"
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Affiliate ID</Label>
          <Input
            value={form.affiliate_id}
            onChange={(e) => setForm({ ...form, affiliate_id: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.api_key}>
          {loading ? "Ajout..." : "Ajouter"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function OfferDetailDialog({
  offer,
  getRawFn,
  saveFn,
}: {
  offer: { id: string; name: string | null; offer_id: string; payout_display: string | null; tracking_link: string | null; html_creative: string | null };
  getRawFn: ReturnType<typeof useServerFn<typeof getOfferRaw>>;
  saveFn: ReturnType<typeof useServerFn<typeof saveOfferDetails>>;
}) {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState("info");
  const [trackingLink, setTrackingLink] = useState(offer.tracking_link ?? "");
  const [creativeHtml, setCreativeHtml] = useState(offer.html_creative ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  useState(() => {
    getRawFn({ data: { id: offer.id } }).then((r) => {
      if (r?.raw) {
        try { setRaw(JSON.parse(r.raw)); } catch { /* ignore */ }
      }
    });
  });

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: { id: offer.id, tracking_link: trackingLink || null, html_creative: creativeHtml || null } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string, which: "link" | "html") {
    navigator.clipboard.writeText(text).then(() => {
      if (which === "link") { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
      else { setCopiedHtml(true); setTimeout(() => setCopiedHtml(false), 2000); }
    });
  }

  const restrictions = raw?.restrictions as string | undefined;
  const previewLink = raw?.preview_link as string | undefined;
  const mediaTypes = raw?.allowed_media_types as Record<string, unknown> | undefined;
  const getMediaTypes = () => {
    if (!mediaTypes) return [];
    const mt = mediaTypes.MediaType;
    if (!mt) return [];
    const arr = Array.isArray(mt) ? mt : [mt];
    return arr.map((m: Record<string, unknown>) => String(m.type_name ?? "")).filter(Boolean);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
      <DialogHeader className="px-6 pt-5 pb-4 border-b">
        <DialogTitle className="flex items-center gap-2 text-base">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">#{offer.offer_id}</span>
          {offer.name}
          {offer.payout_display && (
            <span className="ml-auto text-emerald-600 font-bold text-sm">{offer.payout_display}</span>
          )}
        </DialogTitle>
      </DialogHeader>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="rounded-none border-b bg-transparent h-10 px-6 justify-start gap-4">
          <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Infos</TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Tracking Link</TabsTrigger>
          <TabsTrigger value="creative" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Creative HTML</TabsTrigger>
          {creativeHtml && <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Preview</TabsTrigger>}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="info" className="m-0 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Vertical", (raw?.vertical as string) ?? "—"],
                ["Status", (raw?.status_name as string) ?? "—"],
                ["Format", (raw?.price_format as string) ?? "CPA"],
                ["Payout", offer.payout_display ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-medium text-sm mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {getMediaTypes().length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Traffic autorisé</div>
                <div className="flex flex-wrap gap-1.5">
                  {getMediaTypes().map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {previewLink && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Landing page</div>
                <a href={previewLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline break-all">{previewLink}</a>
              </div>
            )}

            {restrictions && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Restrictions</div>
                <div className="rounded-lg border bg-amber-50 p-3 text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">{restrictions}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tracking" className="m-0 p-6 space-y-4">
            <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Comment obtenir ton tracking link :</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
                <li>Connecte-toi sur le portail CX3ADS publisher</li>
                <li>Va sur l'offre <strong>#{offer.offer_id}</strong></li>
                <li>Génère ton lien affilié (Affiliate ID: 10234)</li>
                <li>Colle-le ci-dessous et sauvegarde</li>
              </ol>
              <div className="mt-2 text-xs">Format CAKE typique : <code className="bg-blue-100 px-1 rounded">https://t.cx3ads.com/click?o={offer.offer_id}&a=10234</code></div>
            </div>
            <div className="space-y-2">
              <Label>Ton tracking link affilié</Label>
              <div className="flex gap-2">
                <Input
                  value={trackingLink}
                  onChange={(e) => setTrackingLink(e.target.value)}
                  placeholder="https://t.cx3ads.com/click?o=..."
                  className="flex-1 font-mono text-sm"
                />
                {trackingLink && (
                  <Button size="sm" variant="outline" onClick={() => copy(trackingLink, "link")} className="gap-1 shrink-0">
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
              {saved ? "Sauvegardé !" : "Sauvegarder"}
            </Button>
          </TabsContent>

          <TabsContent value="creative" className="m-0 p-6 space-y-4">
            <div className="rounded-lg border bg-orange-50 p-4 text-sm text-orange-800">
              <strong>CX3ADS — Creatives sur demande</strong>
              <p className="mt-1 text-xs">Les creatives email ne sont pas disponibles via l'API. Tu dois les demander via : <a href="http://www.Cx3CreativeRequest.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">www.Cx3CreativeRequest.com</a></p>
              <p className="mt-1 text-xs">Une fois approuvé, colle le HTML ici.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>HTML Creative</Label>
                {creativeHtml && (
                  <Button size="sm" variant="ghost" onClick={() => copy(creativeHtml, "html")} className="gap-1 h-7 text-xs">
                    {copiedHtml ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedHtml ? "Copié" : "Copier"}
                  </Button>
                )}
              </div>
              <Textarea
                value={creativeHtml}
                onChange={(e) => setCreativeHtml(e.target.value)}
                placeholder="Colle ici le HTML de la creative email..."
                className="font-mono text-xs min-h-[200px] resize-y"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
              {saved ? "Sauvegardé !" : "Sauvegarder"}
            </Button>
          </TabsContent>

          {creativeHtml && (
            <TabsContent value="preview" className="m-0">
              <div className="border-0 overflow-hidden" style={{ minHeight: "500px" }}>
                <iframe
                  srcDoc={creativeHtml}
                  sandbox="allow-same-origin"
                  className="w-full"
                  style={{ minHeight: "500px", border: 0, background: "#fff" }}
                  title="Creative preview"
                />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </DialogContent>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string | number;
  icon: typeof Briefcase;
  tint: "violet" | "green" | "orange" | "amber";
}) {
  const tints = {
    violet: { bg: "bg-[var(--kpi-violet)]", fg: "text-[var(--kpi-violet-fg)]" },
    green: { bg: "bg-[var(--kpi-green)]", fg: "text-[var(--kpi-green-fg)]" },
    orange: { bg: "bg-[var(--kpi-orange)]", fg: "text-[var(--kpi-orange-fg)]" },
    amber: { bg: "bg-[var(--kpi-amber)]", fg: "text-[var(--kpi-amber-fg)]" },
  }[tint];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${tints.bg} p-5`}>
      <div className={`h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center ${tints.fg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className={`text-3xl font-bold mt-4 ${tints.fg}`}>{value}</div>
      <div className="text-sm text-foreground/80 mt-1">{label}</div>
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/40" />
    </div>
  );
}