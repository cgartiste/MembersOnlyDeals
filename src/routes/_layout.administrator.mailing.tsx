import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Code2, Send, Loader2, Settings as SettingsIcon, Briefcase, Tag, Save, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { listSponsors, getSponsorOffers, saveOfferEmailHtml } from "@/lib/sponsors.functions";
import { previewAudience, sendMailingCampaign } from "@/lib/mailing.functions";

export const Route = createFileRoute("/_layout/administrator/mailing")({
  component: MailingPage,
});

function MailingPage() {
  const fetchSponsors = useServerFn(listSponsors);
  const fetchOffers = useServerFn(getSponsorOffers);
  const saveEmailHtml = useServerFn(saveOfferEmailHtml);
  const previewAud = useServerFn(previewAudience);
  const sendCampaign = useServerFn(sendMailingCampaign);
  const qc = useQueryClient();

  /* ── Sélection sponsor / offre ── */
  const [sponsorId, setSponsorId] = useState("");
  const [offerRowId, setOfferRowId] = useState("");

  /* ── Deux zones HTML ── */
  const [creativeHtml, setCreativeHtml] = useState("");   // zone 1 : creative source
  const [emailHtml, setEmailHtml] = useState("");          // zone 2 : version envoyée
  const [showCreativePreview, setShowCreativePreview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  /* ── Paramètres d'envoi ── */
  const [fromName, setFromName] = useState("Members Only Deals");
  const [fromEmail, setFromEmail] = useState("noreply@global-server.net");
  const [subject, setSubject] = useState("");
  const [sellLink, setSellLink] = useState("");
  const [audStatus, setAudStatus] = useState<"confirmed" | "pending" | "all">("confirmed");
  const [audGender, setAudGender] = useState("");
  const [audCountry, setAudCountry] = useState("");
  const [audInterest, setAudInterest] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [testEmail, setTestEmail] = useState("");

  /* ── Queries ── */
  const sponsorsQ = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => fetchSponsors(),
  });

  const offersQ = useQuery({
    queryKey: ["sponsor-offers-creative", sponsorId],
    queryFn: () => fetchOffers({ data: { sponsorId, search: "" } }),
    enabled: !!sponsorId,
    select: (data) => data.filter((o) => !!o.html_creative),
  });

  const selectedOffer = offersQ.data?.find((o) => o.id === offerRowId) ?? null;

  /* Reset offre quand on change de sponsor */
  useEffect(() => {
    setOfferRowId("");
    setCreativeHtml("");
    setEmailHtml("");
    setSubject("");
    setSellLink("");
  }, [sponsorId]);

  /* Remplir les zones quand une offre est sélectionnée */
  useEffect(() => {
    if (!selectedOffer) return;
    setCreativeHtml(selectedOffer.html_creative ?? "");
    setEmailHtml(selectedOffer.email_html ?? selectedOffer.html_creative ?? "");
    if (!subject) setSubject(selectedOffer.name ?? "");
    if (!sellLink && selectedOffer.tracking_link) setSellLink(selectedOffer.tracking_link);
  }, [selectedOffer]);

  const audienceFilters = {
    status: audStatus,
    gender: audGender || undefined,
    country: audCountry || undefined,
    interest: audInterest || undefined,
  };

  const audQ = useQuery({
    queryKey: ["aud", audStatus, audGender, audCountry, audInterest],
    queryFn: () => previewAud({ data: audienceFilters }),
  });

  const saveM = useMutation({
    mutationFn: () => saveEmailHtml({ data: { id: offerRowId, email_html: emailHtml } }),
    onSuccess: () => {
      toast.success("HTML sauvegardé pour cette offre");
      qc.invalidateQueries({ queryKey: ["sponsor-offers-creative", sponsorId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendM = useMutation({
    mutationFn: (testOnly: boolean) =>
      sendCampaign({
        data: {
          sponsorRowId: offerRowId || undefined,
          fromName,
          fromEmail,
          subject: subject || selectedOffer?.name || "Nouvelle offre exclusive",
          html: emailHtml,
          domain: "global-server.net",
          audience: audienceFilters,
          deliveryTime: deliveryTime ? new Date(deliveryTime).toUTCString() : undefined,
          trackOpens,
          trackClicks,
          testEmail: testOnly ? testEmail : undefined,
          sellLink: sellLink || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success(
        r.scheduled
          ? `Programmé : ${r.totalSent} destinataires`
          : `Envoyé : ${r.totalSent} destinataires (${r.batches} batch)`,
      );
      if (r.errors.length > 0) toast.error(`Erreurs : ${r.errors.join(", ")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mailing</h1>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une offre sponsor et composez l'email à envoyer.
          </p>
        </div>
        <Link to="/administrator/mailing/system">
          <Button variant="outline" className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Emails système
          </Button>
        </Link>
      </div>

      {/* ═══ STEP 1 — Offre & HTML ═══ */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="font-semibold">Choisir le sponsor et l'offre</h2>
        </div>

        {/* Sélecteurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Sponsor
            </Label>
            <Select value={sponsorId} onValueChange={setSponsorId}>
              <SelectTrigger>
                <SelectValue placeholder={sponsorsQ.isLoading ? "Chargement…" : "Sélectionner un sponsor"} />
              </SelectTrigger>
              <SelectContent>
                {(sponsorsQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    <span className="ml-2 text-[10px] uppercase text-muted-foreground">{s.driver}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Offre
              {offersQ.data && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                  {offersQ.data.length} avec creative
                </Badge>
              )}
            </Label>
            <Select value={offerRowId} onValueChange={setOfferRowId} disabled={!sponsorId || offersQ.isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={
                  !sponsorId ? "Sélectionnez d'abord un sponsor"
                  : offersQ.isLoading ? "Chargement…"
                  : offersQ.data?.length === 0 ? "Aucune offre avec creative HTML"
                  : "Sélectionner une offre"
                } />
              </SelectTrigger>
              <SelectContent>
                {(offersQ.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="font-mono text-[10px] text-muted-foreground mr-1">#{o.offer_id}</span>
                    <span className="truncate">{o.name}</span>
                    {o.payout_display && (
                      <span className="ml-2 text-emerald-600 font-semibold text-xs">{o.payout_display}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sponsorId && offersQ.data?.length === 0 && !offersQ.isLoading && (
              <p className="text-xs text-amber-600">
                Aucune offre avec creative. Allez sur{" "}
                <Link to="/administrator/sponsors" className="underline">Sponsors → Détail</Link> pour coller les creatives.
              </p>
            )}
          </div>
        </div>

        {/* Infos offre */}
        {selectedOffer && (
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-wrap gap-4 text-sm">
            {[
              ["Payout", <span className="font-semibold text-emerald-600">{selectedOffer.payout_display ?? "—"}</span>],
              ["Vertical", selectedOffer.vertical ?? "—"],
              ["Status", selectedOffer.status ?? "—"],
              ["Offer ID", <code className="text-xs">#{selectedOffer.offer_id}</code>],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Zone 1 — Creative HTML source */}
        {selectedOffer && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Creative HTML de l'offre (source)
              </Label>
              <Button
                size="sm" variant="outline"
                onClick={() => setShowCreativePreview(v => !v)}
                className="gap-1.5 h-7" disabled={!creativeHtml}
              >
                {showCreativePreview ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showCreativePreview ? "Code" : "Aperçu"}
              </Button>
            </div>
            {showCreativePreview ? (
              <iframe srcDoc={creativeHtml} sandbox="allow-same-origin" title="creative-src"
                className="w-full h-72 rounded-lg border bg-white" />
            ) : (
              <Textarea value={creativeHtml} onChange={e => setCreativeHtml(e.target.value)}
                className="font-mono text-xs h-72 resize-y" placeholder="Creative HTML…" />
            )}

            {/* Bouton copier vers éditeur */}
            <div className="flex justify-center">
              <Button size="sm" variant="secondary" className="gap-2"
                onClick={() => setEmailHtml(creativeHtml)} disabled={!creativeHtml}>
                <ArrowDown className="h-3.5 w-3.5" /> Copier dans l'éditeur d'envoi
              </Button>
            </div>
          </div>
        )}

        {/* Séparateur */}
        {selectedOffer && (
          <div className="border-t border-dashed pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  HTML à envoyer aux clients (votre version)
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Modifiez ici — c'est ce HTML qui sera envoyé à vos subscribers.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => setShowEmailPreview(v => !v)}
                  className="gap-1.5 h-7" disabled={!emailHtml}>
                  {showEmailPreview ? <Code2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showEmailPreview ? "Éditer" : "Aperçu"}
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => saveM.mutate()}
                  disabled={!offerRowId || !emailHtml || saveM.isPending}
                  className="gap-1.5 h-7">
                  {saveM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Sauvegarder
                </Button>
              </div>
            </div>
            {showEmailPreview ? (
              <iframe srcDoc={emailHtml} sandbox="allow-same-origin" title="email-preview"
                className="w-full h-96 rounded-lg border bg-white" />
            ) : (
              <Textarea value={emailHtml} onChange={e => setEmailHtml(e.target.value)}
                className="font-mono text-xs h-96 resize-y"
                placeholder="Collez ou modifiez le HTML à envoyer à vos subscribers…" />
            )}
          </div>
        )}
      </Card>

      {/* ═══ STEP 2 — Audience & envoi ═══ */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold">Destinataires & paramètres d'envoi</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Expéditeur (nom)</Label>
            <Input value={fromName} onChange={e => setFromName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email expéditeur</Label>
            <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sujet</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder={selectedOffer?.name ?? "Sujet de l'email"} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={audStatus} onValueChange={v => setAudStatus(v as typeof audStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Genre</Label>
            <Select value={audGender || "any"} onValueChange={v => setAudGender(v === "any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Tous</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pays</Label>
            <Input value={audCountry} onChange={e => setAudCountry(e.target.value)} placeholder="FR, US…" />
          </div>
          <div className="space-y-1.5">
            <Label>Intérêt</Label>
            <Input value={audInterest} onChange={e => setAudInterest(e.target.value)} placeholder="finance, beauté…" />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between">
          <span><span className="font-semibold">{audQ.data?.count ?? "…"}</span> destinataires</span>
          {(audQ.data?.sample?.length ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground truncate max-w-sm">
              ex : {audQ.data!.sample.slice(0, 3).join(", ")}{audQ.data!.count > 3 ? "…" : ""}
            </span>
          )}
        </div>

        {/* Sell link */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div>
            <Label className="font-semibold">Sell Link (tracking affilié)</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Utilisez <code className="bg-background px-1 rounded">{`{{sell_link}}`}</code> dans le HTML pour l'insérer par abonné.
            </p>
          </div>
          <Input type="url" value={sellLink} onChange={e => setSellLink(e.target.value)}
            placeholder="https://t.cx3ads.com/click?o=1234&a=10234" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Date d'envoi</Label>
            <Input type="datetime-local" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Vide = immédiat. Max +3 jours.</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm">Tracking ouvertures</Label>
              <p className="text-[11px] text-muted-foreground">o:tracking-opens</p>
            </div>
            <Switch checked={trackOpens} onCheckedChange={setTrackOpens} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm">Tracking clics</Label>
              <p className="text-[11px] text-muted-foreground">o:tracking-clicks</p>
            </div>
            <Switch checked={trackClicks} onCheckedChange={setTrackClicks} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Emails de test</Label>
            <Input value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="moi@exemple.com, ami@exemple.com" />
            <p className="text-[11px] text-muted-foreground">Séparés par une virgule.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2"
              disabled={!testEmail || !emailHtml || sendM.isPending}
              onClick={() => sendM.mutate(true)}>
              {sendM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Test
            </Button>
            <Button className="flex-1 gap-2"
              disabled={!emailHtml || !(audQ.data?.count ?? 0) || sendM.isPending}
              onClick={() => sendM.mutate(false)}>
              {sendM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
