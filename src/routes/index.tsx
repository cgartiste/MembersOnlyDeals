import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, CheckCircle2, Mail } from "lucide-react";
import { subscribeNewsletter } from "@/lib/subscribers.functions";
import { listPublicOffers } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Affilix — Exceptional deals that make customers stand out" },
      { name: "description", content: "Affilix curates exceptional, time-limited deals from trusted brands. Join free and get the best offers in your inbox." },
      { property: "og:title", content: "Affilix — Exceptional deals" },
      { property: "og:description", content: "Curated, time-limited affiliate offers from trusted brands." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const subscribe = useServerFn(subscribeNewsletter);
  const fetchOffers = useServerFn(listPublicOffers);
  const offersQ = useQuery({ queryKey: ["public-offers"], queryFn: () => fetchOffers() });
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ already: boolean } | null>(null);

  const m = useMutation({
    mutationFn: () => subscribe({ data: { email } }),
    onSuccess: (r) => setDone({ already: !!r.alreadyConfirmed }),
  });

  const brands = offersQ.data?.slice(0, 6) ?? [];
  const heroImages = (offersQ.data ?? []).filter((o) => o.image_url).slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden">
      {/* Nav */}
      <header className="relative z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a href="#how" className="font-medium hover:opacity-70">Learn More</a>
            <a href="#brands" className="font-medium hover:opacity-70">Partners</a>
          </div>
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Affilix<span className="text-rose-500">.</span>club
          </Link>
          <div className="flex items-center gap-6">
            <a href="#brands" className="font-medium hover:opacity-70">Brands</a>
            <a href="#signup" className="font-medium hover:opacity-70">Join</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        {/* Pink spray blob (left) */}
        <div
          aria-hidden
          className="absolute -top-10 -left-20 w-[640px] h-[640px] opacity-90 pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, rgba(255,182,206,0.95), rgba(255,182,206,0.55) 45%, rgba(255,182,206,0) 75%)",
            filter: "blur(2px)",
            transform: "rotate(-12deg)",
          }}
        />
        {/* Red spray stroke (right) — stylized 'M'-like swoosh via SVG */}
        <svg
          aria-hidden
          viewBox="0 0 600 500"
          className="absolute -top-4 right-0 w-[720px] h-[560px] pointer-events-none opacity-90"
        >
          <defs>
            <filter id="spray">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="14" />
            </filter>
          </defs>
          <path
            d="M40 380 Q 160 60, 260 320 T 480 200 Q 540 100, 560 380"
            stroke="#ef3b48"
            strokeWidth="70"
            strokeLinecap="round"
            fill="none"
            filter="url(#spray)"
            opacity="0.85"
          />
        </svg>

        <div className="relative max-w-7xl mx-auto px-6 pt-6 pb-24">
          <h1 className="relative text-5xl md:text-7xl lg:text-[88px] font-extrabold tracking-[-0.02em] leading-[1.02] max-w-5xl mx-auto text-center">
            <span className="inline-block">Exclusive deals</span>{" "}
            {heroImages[0] && (
              <span
                className="inline-block align-middle mx-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 -rotate-6"
                style={{ width: 120, height: 78 }}
              >
                <img src={heroImages[0].image_url!} alt="" className="h-full w-full object-cover" />
              </span>
            )}{" "}
            <span className="inline-block">that make</span>{" "}
            {heroImages[1] && (
              <span
                className="inline-block align-middle mx-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 rotate-3"
                style={{ width: 120, height: 78 }}
              >
                <img src={heroImages[1].image_url!} alt="" className="h-full w-full object-cover" />
              </span>
            )}{" "}
            <span className="inline-block">customers</span>{" "}
            {heroImages[2] && (
              <span
                className="inline-block align-middle mx-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 -rotate-3"
                style={{ width: 120, height: 78 }}
              >
                <img src={heroImages[2].image_url!} alt="" className="h-full w-full object-cover" />
              </span>
            )}{" "}
            <span className="inline-block">save big</span>
          </h1>

          {/* CTA pills */}
          <div className="relative mt-14 flex items-center justify-center gap-3">
            <a
              href="#signup"
              className="rounded-full bg-[#3753ff] text-white px-5 py-2.5 text-sm font-semibold shadow-md hover:bg-[#2640e8] transition"
            >
              Join free
            </a>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section id="brands" className="relative">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="rounded-3xl px-8 py-12 md:py-14"
            style={{ background: "linear-gradient(180deg,#ffe9ef 0%, #ffffff 100%)" }}
          >
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Brands{" "}
                <span className="inline-flex align-middle h-10 w-10 md:h-12 md:w-12 rounded-xl bg-rose-500 text-white items-center justify-center text-xl">
                  ❤
                </span>{" "}
                we work with
              </h2>
              <p className="text-neutral-600 text-base max-w-md md:mt-3">
                We partner with trusted brands to bring you bold, time-limited offers
                you won't find anywhere else. One inbox. Zero noise.
              </p>
            </div>

            <div className="mt-10 flex gap-5 overflow-x-auto pb-2 snap-x">
              {brands.length > 0 ? brands.map((b) => (
                <div
                  key={b.id}
                  className="relative shrink-0 w-[240px] h-[180px] rounded-2xl overflow-hidden bg-neutral-100 snap-start group"
                >
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-rose-100 to-amber-100" />
                  )}
                  <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
                    <Play className="h-3 w-3 fill-neutral-900 text-neutral-900" />
                  </div>
                  <div className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">
                    {b.name ?? "Offer"}
                  </div>
                </div>
              )) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[240px] h-[180px] rounded-2xl bg-neutral-100 animate-pulse snap-start" />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — stacked cards */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight">Our Services</h2>

        <div className="relative mt-14 max-w-3xl mx-auto">
          {/* Card 1 — blue */}
          <ServiceCard
            number="01"
            title="Curated Deals"
            description="We hand-pick exclusive, time-limited deals from trusted affiliate brands so you only see what's worth your time."
            bullets={["Daily handpicked offers", "Verified brands only", "No spam, ever", "Exclusive member pricing"]}
            bg="bg-[#c7d4ff]"
            rotate="-rotate-1"
            offsetY="translate-y-0"
          />
          {/* Card 2 — white */}
          <ServiceCard
            number="02"
            title="Daily Drops"
            description="New offers drop every day. Get notified the moment something hot goes live so you never miss out."
            bullets={["Inbox alerts", "Stock-limited drops", "Early access perks", "One-click claim"]}
            bg="bg-white border border-neutral-200"
            rotate="rotate-1"
            offsetY="-mt-16 translate-x-12"
          />
          {/* Card 3 — red */}
          <ServiceCard
            number="03"
            title="Member Rewards"
            description="The more you engage, the more you save. Unlock bonus codes and stacked discounts as a VIP member."
            bullets={["Stackable bonus codes", "VIP-only flash sales", "Referral kickbacks", "Lifetime free access"]}
            bg="bg-[#ff5b59] text-white"
            rotate="-rotate-1"
            offsetY="-mt-16"
            light
          />
        </div>
      </section>

      {/* SIGNUP */}
      <section id="signup" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white px-8 md:px-14 py-16">
          <div
            aria-hidden
            className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(closest-side, #ff5b59, transparent 70%)" }}
          />
          <div className="relative max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-rose-400">Join free</div>
            <h2 className="text-3xl md:text-5xl font-extrabold mt-3 leading-tight">
              Get tomorrow's best deals — today.
            </h2>
            <p className="mt-3 text-neutral-300 max-w-lg">
              Drop your email. We'll send only the offers worth your time. Unsubscribe in one click.
            </p>
            {done ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 text-emerald-200 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {done.already ? "You're already on the list." : "Check your inbox to confirm."}
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email) m.mutate(); }}
                className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md"
              >
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 bg-white text-neutral-900 border-0"
                />
                <Button type="submit" disabled={m.isPending} className="h-12 px-6 bg-rose-500 hover:bg-rose-600 text-white border-0 font-semibold gap-2">
                  <Mail className="h-4 w-4" /> {m.isPending ? "…" : "Join free"}
                </Button>
              </form>
            )}
            {m.isError && <p className="text-sm text-rose-300 mt-2">{(m.error as Error).message}</p>}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <div>© {new Date().getFullYear()} Affilix.club — All rights reserved</div>
          <div className="flex gap-5">
            <a href="#signup" className="hover:text-neutral-900">Join</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ServiceCard({
  number, title, description, bullets, bg, rotate, offsetY, light = false,
}: {
  number: string; title: string; description: string; bullets: string[];
  bg: string; rotate: string; offsetY: string; light?: boolean;
}) {
  return (
    <div className={`relative ${offsetY} ${rotate} ${bg} rounded-3xl p-8 md:p-10 shadow-xl`}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {number} {title}
          </div>
          <p className={`mt-4 text-sm ${light ? "text-white/90" : "text-neutral-700"} max-w-sm`}>
            {description}
          </p>
        </div>
        <ul className={`text-sm space-y-1.5 ${light ? "text-white/95" : "text-neutral-700"}`}>
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}