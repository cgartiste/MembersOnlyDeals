import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Send, CheckCircle2, XCircle, Eye, MousePointerClick, Globe, Mail,
  AlertTriangle, UserMinus, Zap, Activity, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  sendTestEmail, getMailgunStats, listMailgunDomains,
  getRecentSends, getMonthlyIncome, getEmailEvents, getEventsSummary, validateEmail,
} from "@/lib/mailgun.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_layout/administrator/mailgun")({
  head: () => ({ meta: [{ title: "Mailgun — PipeSend" }] }),
  component: MailgunPage,
});

const WEBHOOK_URL_NOTE = "https://ton-domaine.com/api/webhooks/mailgun";

const EVENT_COLORS: Record<string, string> = {
  delivered:   "bg-emerald-100 text-emerald-700",
  opened:      "bg-blue-100 text-blue-700",
  clicked:     "bg-violet-100 text-violet-700",
  bounced:     "bg-red-100 text-red-700",
  complained:  "bg-rose-100 text-rose-700",
  unsubscribed:"bg-amber-100 text-amber-700",
  failed:      "bg-orange-100 text-orange-700",
};

function MailgunPage() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState("global-server.net");
  const [days, setDays] = useState("7");
  const [eventFilter, setEventFilter] = useState("all");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchStats      = useServerFn(getMailgunStats);
  const fetchDomains    = useServerFn(listMailgunDomains);
  const fetchRecent     = useServerFn(getRecentSends);
  const fetchIncome     = useServerFn(getMonthlyIncome);
  const fetchEvents     = useServerFn(getEmailEvents);
  const fetchSummary    = useServerFn(getEventsSummary);
  const validateFn      = useServerFn(validateEmail);
  const sendFn          = useServerFn(sendTestEmail);

  const statsQ   = useQuery({ queryKey: ["mg-stats", domain, days], queryFn: () => fetchStats({ data: { domain, days: Number(days) } }) });
  const domainsQ = useQuery({ queryKey: ["mg-domains"],              queryFn: () => fetchDomains() });
  const recentQ  = useQuery({ queryKey: ["mg-recent"],              queryFn: () => fetchRecent() });
  const incomeQ  = useQuery({ queryKey: ["monthly-income"],         queryFn: () => fetchIncome() });
  const eventsQ  = useQuery({ queryKey: ["mg-events", eventFilter], queryFn: () => fetchEvents({ data: { eventType: eventFilter === "all" ? undefined : eventFilter, limit: 200 } }) });
  const summaryQ = useQuery({ queryKey: ["mg-summary", days],       queryFn: () => fetchSummary({ data: { days: Number(days) } }) });

  const [form, setForm] = useState({ from: `noreply@${domain}`, to: "", subject: "Test Members Only Deals", html: "<h1>Hello</h1><p>Ceci est un email de test.</p>" });
  const [validateEmail_, setValidateEmail_] = useState("");
  const [validateResult, setValidateResult] = useState<null | { valid: boolean; result: string; risk: string; isDisposable: boolean; suggestion: string | null }>(null);

  const sendM = useMutation({
    mutationFn: (v: typeof form) => sendFn({ data: { ...v, domain } }),
    onSuccess: (r) => {
      toast.success(`Envoyé à ${r.recipients} destinataire(s)`);
      qc.invalidateQueries({ queryKey: ["mg-recent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validateM = useMutation({
    mutationFn: () => validateFn({ data: { email: validateEmail_ } }),
    onSuccess: (r) => setValidateResult(r),
    onError: (e: Error) => toast.error(e.message),
  });

  const mgTotals = statsQ.data?.totals ?? { accepted: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };
  const wh = summaryQ.data ?? { delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0, failed: 0 };

  function copyWebhook() {
    navigator.clipboard.writeText(WEBHOOK_URL_NOTE);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mailgun</h1>
          <p className="text-sm text-muted-foreground">Envoi, stats, webhooks et nettoyage automatique</p>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Input value={domain} onChange={e => setDomain(e.target.value)} className="h-9 w-52" />
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="14">14 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {statsQ.data?.ok === false && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
          {statsQ.data.error}
        </div>
      )}

      {/* KPIs — stats Mailgun + événements webhooks */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard label="Revenu mois"     value={`$${(incomeQ.data?.revenue ?? 0).toFixed(2)}`} icon={Zap}             tint="violet" />
        <KpiCard label={`Acceptés ${days}j`} value={mgTotals.accepted}  icon={Mail}          tint="violet" />
        <KpiCard label="Delivered"        value={wh.delivered || mgTotals.delivered}  icon={CheckCircle2}  tint="green" />
        <KpiCard label="Opened"           value={wh.opened || mgTotals.opened}     icon={Eye}           tint="blue" />
        <KpiCard label="Clicked"          value={wh.clicked || mgTotals.clicked}    icon={MousePointerClick} tint="violet" />
        <KpiCard label="Bounced"          value={wh.bounced || mgTotals.failed}   icon={XCircle}       tint="red" />
        <KpiCard label="Complaints"       value={wh.complained}          icon={AlertTriangle} tint="orange" />
        <KpiCard label="Unsubs"           value={wh.unsubscribed}        icon={UserMinus}     tint="amber" />
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Événements webhooks</TabsTrigger>
          <TabsTrigger value="sends">Envois récents</TabsTrigger>
          <TabsTrigger value="test">Email de test</TabsTrigger>
          <TabsTrigger value="validate">Valider email</TabsTrigger>
          <TabsTrigger value="setup">Configuration</TabsTrigger>
        </TabsList>

        {/* ── ÉVÉNEMENTS WEBHOOKS ── */}
        <TabsContent value="events" className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les événements</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{eventsQ.data?.length ?? 0} événements</span>
          </div>

          {eventsQ.data?.length === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Aucun événement webhook reçu.</p>
              <p className="text-xs mt-1">Configure l'URL webhook dans Mailgun pour recevoir les événements.</p>
            </div>
          )}

          {(eventsQ.data?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Événement</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>IP / Pays</TableHead>
                    <TableHead>URL cliquée</TableHead>
                    <TableHead>Erreur</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsQ.data?.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${EVENT_COLORS[e.event_type] ?? "bg-muted text-muted-foreground"}`}>
                          {e.event_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{e.recipient ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[e.ip, e.country].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate text-blue-600">
                        {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-rose-600">
                        {[e.error_code, e.error_message].filter(Boolean).join(" — ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── ENVOIS RÉCENTS ── */}
        <TabsContent value="sends">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead className="text-right">Destinataires</TableHead>
                  <TableHead className="text-right">Revenu est.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQ.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun envoi</TableCell>
                  </TableRow>
                )}
                {recentQ.data?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs tabular-nums">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{s.subject ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.offer_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.recipient_count}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                      ${Number(s.estimated_revenue ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── EMAIL DE TEST ── */}
        <TabsContent value="test">
          <div className="rounded-xl border bg-card p-5 space-y-4 max-w-2xl">
            <div className="font-semibold">Envoyer un email de test</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>From</Label>
                <Input value={form.from} onChange={e => setForm({...form, from: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>To (virgules)</Label>
                <Input value={form.to} onChange={e => setForm({...form, to: e.target.value})} placeholder="a@x.com, b@y.com" /></div>
              <div className="space-y-1.5 col-span-2"><Label>Sujet</Label>
                <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} /></div>
              <div className="space-y-1.5 col-span-2"><Label>HTML</Label>
                <Textarea value={form.html} onChange={e => setForm({...form, html: e.target.value})} rows={8} className="font-mono text-xs" /></div>
            </div>
            <Button className="gap-2" disabled={sendM.isPending || !form.to} onClick={() => sendM.mutate(form)}>
              <Send className="h-4 w-4" />
              {sendM.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        </TabsContent>

        {/* ── VALIDATION EMAIL ── */}
        <TabsContent value="validate">
          <div className="rounded-xl border bg-card p-5 space-y-4 max-w-lg">
            <div className="font-semibold">Valider une adresse email</div>
            <p className="text-sm text-muted-foreground">Vérifie si une adresse est valide, jetable ou à risque via l'API Mailgun.</p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={validateEmail_}
                onChange={e => setValidateEmail_(e.target.value)}
                placeholder="test@exemple.com"
                className="flex-1"
              />
              <Button onClick={() => validateM.mutate()} disabled={!validateEmail_ || validateM.isPending}>
                Vérifier
              </Button>
            </div>
            {validateResult && (
              <div className={`rounded-lg border p-4 space-y-2 ${validateResult.valid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="flex items-center gap-2">
                  {validateResult.valid
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : <XCircle className="h-5 w-5 text-rose-600" />}
                  <span className="font-semibold">{validateResult.valid ? "Email valide" : "Email invalide / à risque"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Résultat : </span><strong>{validateResult.result}</strong></div>
                  <div><span className="text-muted-foreground">Risque : </span><strong>{validateResult.risk}</strong></div>
                  <div><span className="text-muted-foreground">Jetable : </span><strong>{validateResult.isDisposable ? "Oui ⚠️" : "Non"}</strong></div>
                  {validateResult.suggestion && (
                    <div><span className="text-muted-foreground">Suggestion : </span><strong>{validateResult.suggestion}</strong></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── CONFIGURATION WEBHOOKS ── */}
        <TabsContent value="setup" className="space-y-4">
          <div className="rounded-xl border bg-card p-5 max-w-2xl space-y-5">
            <div>
              <div className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-violet-500" /> Configuration des webhooks Mailgun</div>
              <p className="text-sm text-muted-foreground mt-1">
                Les webhooks envoient des événements en temps réel à ton app (opens, clics, bounces, plaintes…).
              </p>
            </div>

            <div className="space-y-2">
              <Label>URL de ton webhook</Label>
              <div className="flex gap-2">
                <Input value={WEBHOOK_URL_NOTE} readOnly className="font-mono text-sm flex-1 bg-muted" />
                <Button size="sm" variant="outline" onClick={copyWebhook} className="gap-1.5">
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Remplace <code>ton-domaine.com</code> par le vrai domaine de ton app déployée.
              </p>
            </div>

            <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 space-y-3 text-sm text-blue-900">
              <strong>Comment configurer dans Mailgun :</strong>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Va sur <strong>mailgun.com → Sending → Webhooks</strong></li>
                <li>Clique <strong>"Add webhook"</strong></li>
                <li>Sélectionne le domaine <strong>global-server.net</strong></li>
                <li>Colle l'URL ci-dessus</li>
                <li>Coche tous les événements : <strong>delivered, opened, clicked, bounced, complained, unsubscribed, failed</strong></li>
                <li>Sauvegarde</li>
              </ol>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="font-semibold text-sm">Ce qui se passe automatiquement :</div>
              <ul className="space-y-1.5 text-sm">
                {[
                  ["Bounced", "✅ Subscriber marqué 'bounced' automatiquement"],
                  ["Complained (spam)", "✅ Subscriber désabonné immédiatement"],
                  ["Unsubscribed", "✅ Subscriber marqué 'unsubscribed'"],
                  ["Opened", "✅ Événement enregistré (qui a ouvert)"],
                  ["Clicked", "✅ Événement enregistré (qui a cliqué, sur quel lien)"],
                  ["Delivered", "✅ Confirmé et enregistré"],
                ].map(([ev, action]) => (
                  <li key={ev} className="flex gap-3">
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold self-start mt-0.5 ${EVENT_COLORS[ev.toLowerCase().split(" ")[0]] ?? "bg-muted text-muted-foreground"}`}>
                      {ev}
                    </span>
                    <span className="text-muted-foreground text-xs">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
              <div className="font-semibold">Clé de signature webhook</div>
              <div className="text-muted-foreground">
                Configurée dans ton <code>.env</code> : <code className="bg-background px-1 rounded">MAILGUN_WEBHOOK_KEY</code><br />
                Valeur actuelle : {process.env.MAILGUN_WEBHOOK_KEY ? "✅ Présente" : "❌ Manquante"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 max-w-2xl">
            <div className="font-semibold mb-3">Domaines Mailgun</div>
            <ul className="space-y-2">
              {domainsQ.data?.items.map((d) => (
                <li key={d.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{d.name}</span>
                  <Badge variant={d.state === "active" ? "default" : "secondary"} className="text-[10px]">
                    {d.state}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tint }: {
  label: string; value: string | number;
  icon: typeof Send; tint: "violet" | "green" | "blue" | "orange" | "amber" | "red";
}) {
  const colors = {
    violet: { bg: "bg-violet-50", fg: "text-violet-700", icon: "bg-violet-100" },
    green:  { bg: "bg-emerald-50", fg: "text-emerald-700", icon: "bg-emerald-100" },
    blue:   { bg: "bg-blue-50",   fg: "text-blue-700",   icon: "bg-blue-100" },
    orange: { bg: "bg-orange-50", fg: "text-orange-700", icon: "bg-orange-100" },
    amber:  { bg: "bg-amber-50",  fg: "text-amber-700",  icon: "bg-amber-100" },
    red:    { bg: "bg-red-50",    fg: "text-red-700",    icon: "bg-red-100" },
  }[tint];
  return (
    <div className={`rounded-xl border ${colors.bg} p-3`}>
      <div className={`h-7 w-7 rounded-lg ${colors.icon} flex items-center justify-center ${colors.fg}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-xl font-bold mt-2 ${colors.fg}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
