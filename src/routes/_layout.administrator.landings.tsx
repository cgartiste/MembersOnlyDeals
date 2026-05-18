import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink, Save, Loader2, FileCode2 } from "lucide-react";
import { toast } from "sonner";

import { listLandings, getLanding, upsertLanding, deleteLanding } from "@/lib/landings.functions";
import { getSponsorOffers, listSponsors } from "@/lib/sponsors.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_layout/administrator/landings")({
  head: () => ({ meta: [{ title: "Landing Pages — Administrator" }] }),
  component: LandingsPage,
});

type FormState = {
  id?: string;
  slug: string;
  title: string;
  html: string;
  image_url: string;
  offer_id: string;
  published: boolean;
};

const EMPTY: FormState = {
  slug: "", title: "", html: "", image_url: "", offer_id: "", published: true,
};

function LandingsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listLandings);
  const fetchOne = useServerFn(getLanding);
  const upsert = useServerFn(upsertLanding);
  const del = useServerFn(deleteLanding);
  const fetchSponsors = useServerFn(listSponsors);
  const fetchOffers = useServerFn(getSponsorOffers);

  const list = useQuery({ queryKey: ["landings"], queryFn: () => fetchList() });
  const sponsors = useQuery({ queryKey: ["sponsors"], queryFn: () => fetchSponsors() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sponsorId, setSponsorId] = useState<string>("");

  const offers = useQuery({
    queryKey: ["sponsor-offers", sponsorId],
    queryFn: () => fetchOffers({ data: { sponsorId } }),
    enabled: !!sponsorId,
  });

  const save = useMutation({
    mutationFn: () => upsert({
      data: {
        id: form.id,
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        html: form.html,
        image_url: form.image_url.trim() || null,
        offer_id: form.offer_id.trim() || null,
        published: form.published,
      },
    }),
    onSuccess: () => {
      toast.success("Landing saved");
      setOpen(false); setForm(EMPTY); setSponsorId("");
      qc.invalidateQueries({ queryKey: ["landings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["landings"] });
    },
  });

  async function openEdit(id: string) {
    const row = await fetchOne({ data: { id } });
    if (!row) return;
    setForm({
      id: row.id,
      slug: row.slug,
      title: row.title,
      html: row.html ?? "",
      image_url: row.image_url ?? "",
      offer_id: row.offer_id ?? "",
      published: row.published,
    });
    setOpen(true);
  }

  function openNew() {
    setForm(EMPTY); setSponsorId(""); setOpen(true);
  }

  // Auto-fill from selected offer
  useEffect(() => {
    if (!form.offer_id || !offers.data) return;
    const o = offers.data.find((x) => x.offer_id === form.offer_id);
    if (!o) return;
    setForm((f) => ({
      ...f,
      title: f.title || o.name || "",
      image_url: f.image_url || o.image_url || "",
      slug: f.slug || o.slug || "",
      html: f.html || o.html_creative || "",
    }));
  }, [form.offer_id, offers.data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCode2 className="h-6 w-6 text-primary" />
            Affiliate Landings
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste raw HTML landings — they'll be served at <code>/l/&lt;slug&gt;</code> and listed on the public site.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New landing
        </Button>
      </div>

      <div className="rounded-2xl border bg-card">
        {list.isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : list.data && list.data.length > 0 ? (
          <ul className="divide-y">
            {list.data.map((l) => (
              <li key={l.id} className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {l.image_url ? (
                    <img src={l.image_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    /l/{l.slug} {l.published ? "" : "· draft"}
                  </div>
                </div>
                <a
                  href={`/l/${l.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
                <Button size="sm" variant="outline" onClick={() => openEdit(l.id)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(l.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No landings yet. Click "New landing" to paste your first HTML.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit landing" : "New landing"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sponsor (autofill)</Label>
                <Select value={sponsorId} onValueChange={setSponsorId}>
                  <SelectTrigger><SelectValue placeholder="Pick a sponsor" /></SelectTrigger>
                  <SelectContent>
                    {(sponsors.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Offer (autofill)</Label>
                <Select
                  value={form.offer_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, offer_id: v }))}
                  disabled={!sponsorId}
                >
                  <SelectTrigger><SelectValue placeholder={sponsorId ? "Pick an offer" : "Pick sponsor first"} /></SelectTrigger>
                  <SelectContent>
                    {(offers.data ?? []).map((o) => (
                      <SelectItem key={o.offer_id} value={o.offer_id}>
                        {o.name ?? o.offer_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="my-offer"
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Amazing Offer"
                />
              </div>
            </div>

            <div>
              <Label>Cover image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div>
              <Label>HTML content</Label>
              <Textarea
                value={form.html}
                onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
                placeholder="<div>Paste your full landing HTML here…</div>"
                className="min-h-[300px] font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label>Published (visible to public)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.slug || !form.title} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}