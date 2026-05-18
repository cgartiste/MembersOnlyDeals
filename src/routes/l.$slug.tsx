import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPublicLanding } from "@/lib/landings.functions";

export const Route = createFileRoute("/l/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Exclusive Offer` },
      { name: "description", content: "Limited-time exclusive affiliate offer." },
    ],
  }),
  component: LandingPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-neutral-500">
      Offer not found.
      <Link to="/" className="ml-2 underline">Back home</Link>
    </div>
  ),
});

function LandingPage() {
  const { slug } = Route.useParams();
  const fetchOne = useServerFn(getPublicLanding);
  const q = useQuery({ queryKey: ["public-landing", slug], queryFn: () => fetchOne({ data: { slug } }) });

  if (q.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  }
  if (!q.data) throw notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium hover:text-rose-500">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
      {/* Raw HTML provided by admin */}
      <div dangerouslySetInnerHTML={{ __html: q.data.html }} />
    </div>
  );
}