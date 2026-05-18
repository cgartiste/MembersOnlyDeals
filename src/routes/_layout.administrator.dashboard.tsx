import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Send, DollarSign, Briefcase, MousePointerClick, Sparkles, AlertTriangle, CheckCircle2, XCircle, Eye } from "lucide-react";

import { getDashboardStats } from "@/lib/sponsors.functions";
import { getMailgunStats, getMonthlyIncome, getRecentSends, getMailgunAccountInfo } from "@/lib/mailgun.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/administrator/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PipeSend" }] }),
  component: DashboardPage,
});

type Kpi = {
  label: string;
  value: string | number;
  caption: string;
  badge: string;
  tint: "violet" | "green" | "orange" | "amber";
  icon: typeof Send;
};

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fetchStats() });
  const fetchMg = useServerFn(getMailgunStats);
  const fetchIncome = useServerFn(getMonthlyIncome);
  const fetchRecent = useServerFn(getRecentSends);
  const fetchAccount = useServerFn(getMailgunAccountInfo);
  const mgQ = useQuery({
    queryKey: ["mg-stats", "global-server.net"],
    queryFn: () => fetchMg({ data: { domain: "global-server.net", days: 7 } }),
  });
  const incomeQ = useQuery({ queryKey: ["monthly-income"], queryFn: () => fetchIncome() });
  const recentQ = useQuery({ queryKey: ["mg-recent"], queryFn: () => fetchRecent() });
  const accountQ = useQuery({ queryKey: ["mg-account"], queryFn: () => fetchAccount() });
  const totals = mgQ.data?.totals ?? { accepted: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };

  const kpis: Kpi[] = [
    {
      label: "Income sponsors · mois",
      value: `$${(incomeQ.data?.revenue ?? 0).toFixed(2)}`,
      caption: `${incomeQ.data?.sends ?? 0} envois · ${incomeQ.data?.recipients ?? 0} destinataires`,
      badge: "REVENUE",
      tint: "violet",
      icon: DollarSign,
    },
    {
      label: "Offres sponsors",
      value: data?.offer_count ?? 0,
      caption: "Offres synchronisées via CAKE",
      badge: "OFFERS",
      tint: "green",
      icon: Briefcase,
    },
    {
      label: "Delivered 7j",
      value: totals.delivered,
      caption: `${totals.accepted} acceptés · ${totals.failed} échecs`,
      badge: "MAILGUN",
      tint: "orange",
      icon: Send,
    },
    {
      label: "Clics 7j",
      value: totals.clicked,
      caption: `${totals.opened} ouvertures via Mailgun`,
      badge: "ENGAGEMENT",
      tint: "amber",
      icon: MousePointerClick,
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          PipeSend — Email Marketing Platform
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Nexus — Your Email Intelligence</div>
          <div className="text-xs text-muted-foreground">
            Real-time analysis of your campaigns, subscribers and deliverability
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-emerald-600" />
          Action needed
        </Button>
        <Button size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Ask Nexus
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">📡 Mailgun Health</div>
            <Link to="/administrator/mailgun" className="text-xs text-primary hover:underline">
              View →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat color="text-emerald-600" value={totals.delivered} label="Delivered" />
            <Stat color="text-orange-500" value={totals.failed} label="Failed" />
            <Stat color="text-primary" value={totals.opened} label="Opened" />
            <Stat color="text-amber-500" value={totals.clicked} label="Clicked" />
          </div>
          {mgQ.data?.ok === false && (
            <div className="mt-4 text-xs text-rose-600">{mgQ.data.error}</div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">📦 Mailgun Quota</div>
            <span className="text-xs text-muted-foreground">{accountQ.data?.plan ?? "—"}</span>
          </div>
          {accountQ.data?.ok ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Stat color="text-primary" value={(accountQ.data.sentThisPeriod ?? 0).toLocaleString()} label="Envoyés ce mois" />
                <Stat color="text-emerald-600" value={accountQ.data.monthlyLimit != null ? accountQ.data.monthlyLimit.toLocaleString() : "—"} label="Quota mensuel" />
              </div>
              {accountQ.data.monthlyLimit ? (
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((accountQ.data.sentThisPeriod ?? 0) / accountQ.data.monthlyLimit) * 100).toFixed(1)}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {(((accountQ.data.sentThisPeriod ?? 0) / accountQ.data.monthlyLimit) * 100).toFixed(1)}% utilisé · statut: {accountQ.data.status ?? "—"}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">{accountQ.data?.error ?? "Chargement…"}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">💰 Sponsors income · mois</div>
            <Link to="/administrator/sponsors" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Stat color="text-emerald-600" value={`$${(incomeQ.data?.revenue ?? 0).toFixed(2)}`} label="Revenue" />
            <Stat color="text-primary" value={incomeQ.data?.sends ?? 0} label="Envois" />
            <Stat color="text-amber-500" value={incomeQ.data?.recipients ?? 0} label="Destinataires" />
          </div>
          <Link to="/administrator/mailgun" className="block mt-5">
            <Button variant="outline" className="w-full gap-2">
              <Send className="h-4 w-4" /> Envoyer une offre
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5 min-h-[200px]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">📢 Envois récents</div>
            <Link to="/administrator/mailgun" className="text-xs text-primary hover:underline">Tout voir →</Link>
          </div>
          <div className="space-y-2 text-sm">
            {recentQ.data?.length === 0 && (
              <div className="text-center text-muted-foreground py-10">Aucun envoi</div>
            )}
            {recentQ.data?.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                <span className="truncate">
                  <span className="font-medium">{s.subject ?? "—"}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.recipient_count} destinataire(s)</span>
                </span>
                <span className="text-xs tabular-nums font-semibold text-emerald-600">
                  ${Number(s.estimated_revenue ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 min-h-[200px]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">⚡ Mailgun stats 7j</div>
            <div className="text-xs text-muted-foreground">{mgQ.data?.domain}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MgRow icon={Send} label="Accepted" value={totals.accepted} />
            <MgRow icon={CheckCircle2} label="Delivered" value={totals.delivered} color="text-emerald-600" />
            <MgRow icon={XCircle} label="Failed" value={totals.failed} color="text-rose-500" />
            <MgRow icon={Eye} label="Opened" value={totals.opened} color="text-amber-500" />
            <MgRow icon={MousePointerClick} label="Clicked" value={totals.clicked} color="text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MgRow({ icon: Icon, label, value, color = "text-foreground" }: { icon: typeof Send; label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className={`font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function Stat({ color, value, label }: { color: string; value: string | number; label: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function KpiCard({ label, value, caption, badge, tint, icon: Icon }: Kpi) {
  const tints: Record<Kpi["tint"], { bg: string; fg: string; badge: string }> = {
    violet: { bg: "bg-[var(--kpi-violet)]", fg: "text-[var(--kpi-violet-fg)]", badge: "bg-white/60 text-[var(--kpi-violet-fg)]" },
    green: { bg: "bg-[var(--kpi-green)]", fg: "text-[var(--kpi-green-fg)]", badge: "bg-white/60 text-[var(--kpi-green-fg)]" },
    orange: { bg: "bg-[var(--kpi-orange)]", fg: "text-[var(--kpi-orange-fg)]", badge: "bg-white/60 text-[var(--kpi-orange-fg)]" },
    amber: { bg: "bg-[var(--kpi-amber)]", fg: "text-[var(--kpi-amber-fg)]", badge: "bg-white/60 text-[var(--kpi-amber-fg)]" },
  };
  const t = tints[tint];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${t.bg} p-5`}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center ${t.fg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${t.badge}`}>
          {badge}
        </span>
      </div>
      <div className={`text-4xl font-bold mt-6 ${t.fg}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground/80">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{caption}</div>
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/40" />
    </div>
  );
}