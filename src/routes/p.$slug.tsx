import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPublicProduct } from "@/lib/products.functions";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Affilix` },
      { name: "description", content: "Exclusive product offer on Affilix." },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-neutral-500">
      Product not found.
      <Link to="/" className="ml-2 underline">
        Back home
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const fetchOne = useServerFn(getPublicProduct);
  const q = useQuery({
    queryKey: ["public-product", slug],
    queryFn: () => fetchOne({ data: { slug } }),
  });

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>
    );
  }
  if (!q.data) throw notFound();
  const p = q.data;

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Site nav (matches homepage) */}
      <header className="relative z-30 border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-1 font-medium hover:opacity-70">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Affilix<span className="text-rose-500">.</span>club
          </Link>
          <Link to="/blog" className="font-medium hover:opacity-70">
            All offers
          </Link>
        </div>
      </header>

      {/* Product header */}
      <section className="w-full max-w-none px-6 md:px-10 lg:px-16 pt-12 pb-8">
        <div className="grid md:grid-cols-2 gap-10 items-center w-full">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-100">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-rose-100 to-amber-100" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-rose-500">
              Exclusive offer
            </div>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
              {p.title}
            </h1>
            {p.description && <p className="mt-4 text-neutral-600 text-lg">{p.description}</p>}
            {p.price && (
              <div className="mt-6 inline-flex items-baseline gap-2 rounded-full bg-neutral-900 text-white px-5 py-2 text-lg font-bold">
                {p.price}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Admin-pasted HTML, wrapped in our prose container so it stays inside the design */}
      <article className="w-full max-w-none px-0 pb-20 overflow-hidden">
        <div
          className="product-html w-full max-w-none"
          dangerouslySetInnerHTML={{ __html: p.html }}
        />
      </article>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <div>© {new Date().getFullYear()} Affilix.club — All rights reserved</div>
          <div className="flex gap-5">
            <Link to="/blog" className="hover:text-neutral-900">
              Blog
            </Link>
            <Link to="/" className="hover:text-neutral-900">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
