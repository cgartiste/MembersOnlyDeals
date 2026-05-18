import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Upload, Users, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listSubscribers,
  getSubscribersStats,
  importSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from "@/lib/subscribers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_layout/administrator/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers — PipeSend" }] }),
  component: SubscribersPage,
});

function SubscribersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSubscribers);
  const statsFn = useServerFn(getSubscribersStats);
  const importFn = useServerFn(importSubscribers);
  const updateFn = useServerFn(updateSubscriber);
  const deleteFn = useServerFn(deleteSubscriber);

  const [filters, setFilters] = useState({
    status: "all" as "all" | "pending" | "confirmed" | "unsubscribed",
    gender: "",
    country: "",
    interest: "",
    search: "",
  });
  const [importOpen, setImportOpen] = useState(false);

  const statsQ = useQuery({ queryKey: ["sub-stats"], queryFn: () => statsFn() });
  const listQ = useQuery({
    queryKey: ["subscribers", filters],
    queryFn: () =>
      listFn({
        data: {
          status: filters.status,
          gender: filters.gender || undefined,
          country: filters.country || undefined,
          interest: filters.interest || undefined,
          search: filters.search || undefined,
        },
      }),
  });

  const importM = useMutation({
    mutationFn: (v: { raw: string; sendConfirmation: boolean }) => importFn({ data: v }),
    onSuccess: (r) => {
      toast.success(
        `Importés : ${r.imported} · ignorés : ${r.skipped} · confirmations envoyées : ${r.sent}`,
      );
      setImportOpen(false);
      qc.invalidateQueries({ queryKey: ["subscribers"] });
      qc.invalidateQueries({ queryKey: ["sub-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: (v: NonNullable<Parameters<typeof updateFn>[0]>["data"]) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscribers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscribers"] });
      qc.invalidateQueries({ queryKey: ["sub-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = statsQ.data ?? { total: 0, pending: 0, confirmed: 0, unsubscribed: 0 };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Newsletter — opt-in confirmé, segmentation et import CSV
          </p>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Importer CSV
            </Button>
          </DialogTrigger>
          <ImportDialog onSubmit={(v) => importM.mutate(v)} loading={importM.isPending} />
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total" value={stats.total} icon={Users} tint="violet" />
        <Kpi label="Confirmés" value={stats.confirmed} icon={CheckCircle2} tint="green" />
        <Kpi label="En attente" value={stats.pending} icon={Clock} tint="amber" />
        <Kpi label="Désinscrits" value={stats.unsubscribed} icon={Trash2} tint="orange" />
      </div>

      <div className="rounded-2xl border bg-card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(v: typeof filters.status) => setFilters({ ...filters, status: v })}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="confirmed">Confirmés</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="unsubscribed">Désinscrits</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.gender || "any"} onValueChange={(v) =>
          setFilters({ ...filters, gender: v === "any" ? "" : v })}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Genre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Tous genres</SelectItem>
            <SelectItem value="male">Homme</SelectItem>
            <SelectItem value="female">Femme</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Pays"
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value })}
          className="h-9"
        />
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Intérêt</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Motivation</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {!listQ.isLoading && listQ.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Aucun abonné — partagez votre page newsletter ou importez un CSV.
                </TableCell>
              </TableRow>
            )}
            {listQ.data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                      s.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : s.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status}
                  </span>
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={s.gender}
                    options={[
                      { v: "", label: "—" },
                      { v: "male", label: "Homme" },
                      { v: "female", label: "Femme" },
                      { v: "other", label: "Autre" },
                    ]}
                    onChange={(v) => updateM.mutate({ id: s.id, gender: v || null })}
                  />
                </TableCell>
                <TableCell>
                  <InlineText
                    value={s.country ?? ""}
                    onSave={(v) => updateM.mutate({ id: s.id, country: v || null })}
                  />
                </TableCell>
                <TableCell>
                  <InlineText
                    value={s.interest ?? ""}
                    onSave={(v) => updateM.mutate({ id: s.id, interest: v || null })}
                  />
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={s.level}
                    options={[
                      { v: "", label: "—" },
                      { v: "cold", label: "Cold" },
                      { v: "warm", label: "Warm" },
                      { v: "hot", label: "Hot" },
                      { v: "vip", label: "VIP" },
                    ]}
                    onChange={(v) => updateM.mutate({ id: s.id, level: v || null })}
                  />
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {s.motivation ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.source}</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-600"
                    onClick={() => {
                      if (confirm(`Supprimer ${s.email} ?`)) deleteM.mutate(s.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InlineSelect({
  value, options, onChange,
}: {
  value: string | null;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded border bg-background px-1.5 text-xs"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.label}</option>
      ))}
    </select>
  );
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <Input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      className="h-7 text-xs w-28"
    />
  );
}

function ImportDialog({
  onSubmit, loading,
}: {
  onSubmit: (v: { raw: string; sendConfirmation: boolean }) => void;
  loading: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Importer des emails</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Un email par ligne, ou séparés par virgules. Chaque adresse reçoit un token unique
          et un email de confirmation (double opt-in).
        </p>
        <Textarea
          rows={10}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"alice@example.com\nbob@example.com, charlie@example.com"}
          className="font-mono text-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendConfirmation}
            onChange={(e) => setSendConfirmation(e.target.checked)}
          />
          Envoyer un email de confirmation à chaque adresse
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ raw, sendConfirmation })} disabled={loading || !raw.trim()}>
          {loading ? "Import..." : "Importer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Kpi({
  label, value, icon: Icon, tint,
}: {
  label: string; value: number;
  icon: typeof Users;
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
      <div className={`text-3xl font-bold mt-3 ${tints.fg}`}>{value}</div>
      <div className="text-sm text-foreground/80 mt-1">{label}</div>
    </div>
  );
}
