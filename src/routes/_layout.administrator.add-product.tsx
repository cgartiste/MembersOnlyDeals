import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Save, Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import {
  listProducts, getProduct, upsertProduct, deleteProduct,
} from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_layout/administrator/add-product")({
  head: () => ({ meta: [{ title: "Add Product — Administrator" }] }),
  component: AddProductPage,
});

type FormState = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  html: string;
  published: boolean;
};

const EMPTY: FormState = {
  slug: "", title: "", description: "", price: "", image_url: "", html: "", published: true,
};

function AddProductPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listProducts);
  const fetchOne = useServerFn(getProduct);
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);

  const list = useQuery({ queryKey: ["admin-products"], queryFn: () => fetchList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const save = useMutation({
    mutationFn: () => upsert({
      data: {
        id: form.id,
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price.trim() || null,
        image_url: form.image_url.trim() || null,
        html: form.html,
        published: form.published,
      },
    }),
    onSuccess: () => {
      toast.success("Product saved");
      setOpen(false); setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  async function openEdit(id: string) {
    const row = await fetchOne({ data: { id } });
    if (!row) return;
    setForm({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description ?? "",
      price: row.price ?? "",
      image_url: row.image_url ?? "",
      html: row.html ?? "",
      published: row.published,
    });
    setOpen(true);
  }

  function openNew() { setForm(EMPTY); setOpen(true); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" />
            Add Product
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste the product's raw HTML — it'll be served at <code>/p/&lt;slug&gt;</code> inside the site layout.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      <div className="rounded-2xl border bg-card">
        {list.isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : list.data && list.data.length > 0 ? (
          <ul className="divide-y">
            {list.data.map((p) => (
              <li key={p.id} className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    /p/{p.slug} {p.price ? `· ${p.price}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(p.id)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No products yet. Click "New product" to add your first one.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="amazing-watch" />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Amazing Smart Watch" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cover image URL</Label>
                <Input value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…" />
              </div>
            </div>

            <div>
              <Label>Short description</Label>
              <Input value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="One-line teaser shown in listings" />
            </div>

            <div>
              <Label>HTML content (rendered inside site layout)</Label>
              <Textarea value={form.html}
                onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
                placeholder="<section>Paste your full product HTML here…</section>"
                className="min-h-[300px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()}
              disabled={save.isPending || !form.slug || !form.title} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
