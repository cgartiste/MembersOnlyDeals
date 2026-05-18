import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { listPublicProducts } from "@/lib/products.functions";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "All articles — Affilix" },
      { name: "description", content: "Browse every article published on Affilix." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const fetchProducts = useServerFn(listPublicProducts);
  const q = useQuery({ queryKey: ["public-products"], queryFn: () => fetchProducts() });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Affilix<span className="text-rose-500">.</span>club
          </Link>
          <nav className="text-sm flex gap-6">
            <Link to="/" className="hover:opacity-70 font-medium">Home</Link>
            <Link to="/blog" className="text-rose-500 font-semibold">All articles</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">All articles</h1>
        <p className="mt-3 text-neutral-600 max-w-2xl">Every article published on Affilix.</p>

        <div className="mt-12">
          {q.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : q.data && q.data.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {q.data.map((p) => (
                <Link
                  key={p.id}
                  to="/p/$slug"
                  params={{ slug: p.slug }}
                  className="group block rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:shadow-xl transition"
                >
                  <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-rose-100 to-amber-100" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="font-semibold mt-1 line-clamp-2 group-hover:text-rose-500 transition-colors">{p.title}</div>
                    {p.description && (
                      <div className="mt-1 text-xs text-neutral-500 line-clamp-2">{p.description}</div>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-900">
                      Read more <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-12 text-center text-neutral-500">No articles yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}