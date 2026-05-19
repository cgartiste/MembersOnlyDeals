import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain, BarChart3, Search, Tag, RefreshCw, Package, Bell,
  Upload, CalendarDays, Chrome, CheckCircle2, ArrowRight,
  Sparkles, TrendingUp, Users, Zap, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TubeMind — The AI Platform Built for YouTubers" },
      { name: "description", content: "Grow your YouTube channel with AI. Script generation, SEO optimization, competitor analysis, bulk tag management and direct upload — all in one platform." },
      { property: "og:title", content: "TubeMind — The AI Platform Built for YouTubers" },
      { property: "og:description", content: "Script AI, analytics, competitor research, tag management & YouTube upload. Everything a creator needs." },
    ],
  }),
  component: HomePage,
});

const FEATURES = [
  { icon: Brain,        title: "Script AI",             desc: "Transform any topic into a full optimized script with hooks, CTAs, and chapters in seconds.", tag: "Most popular" },
  { icon: BarChart3,    title: "Analytics Dashboard",   desc: "Real-time stats: views, CTR, retention, estimated revenue and audience insights." },
  { icon: Search,       title: "Competitor Research",   desc: "See what's working for top creators in your niche — titles, tags, strategies." },
  { icon: Tag,          title: "Tag Gap Analysis",      desc: "Find tags your competitors have that you're missing. Get more visibility instantly." },
  { icon: RefreshCw,    title: "Auto-Optimize",         desc: "Your existing videos are automatically re-optimized every week. No manual work.", tag: "Unique" },
  { icon: Package,      title: "Bulk Update",           desc: "Update tags, titles or descriptions on 50+ videos at once. 16 hours of work in 30 seconds." },
  { icon: Bell,         title: "Tag Alerts",            desc: "Get notified the moment a competitor changes their tags or title. React first." },
  { icon: Upload,       title: "Upload Manager",        desc: "Upload videos directly to YouTube with AI-generated title, description and tags pre-filled." },
  { icon: CalendarDays, title: "Content Calendar",      desc: "Plan your editorial schedule. Never run out of video ideas with AI suggestions." },
  { icon: Chrome,       title: "Chrome Extension",      desc: "See stats and competitor data directly on YouTube pages without leaving your browser." },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    desc: "Get started. No credit card.",
    cta: "Start for free",
    features: ["2 analyses / month", "Chrome extension", "Basic analytics", "Script generator (3/month)"],
    highlight: false,
  },
  {
    name: "Creator",
    price: "$19",
    period: "/month",
    desc: "For growing channels.",
    cta: "Start Creator",
    features: ["20 videos / month", "Full tag management", "Auto-optimize weekly", "Competitor research", "Bulk update (50 videos)", "Tag gap analysis", "Upload manager"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "For serious creators & agencies.",
    cta: "Start Pro",
    features: ["Unlimited videos", "Everything in Creator", "Real-time tag alerts", "Multi-channel support", "Priority AI processing", "API access", "Dedicated support"],
    highlight: false,
  },
];

const STATS = [
  { value: "10x", label: "faster SEO optimization" },
  { value: "3h", label: "saved per video on average" },
  { value: "+47%", label: "average CTR improvement" },
  { value: "1 click", label: "to update 50 videos" },
];

function HomePage() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Tube<span className="text-violet-600">Mind</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#features" className="hover:text-violet-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-violet-600 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-violet-600 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/creator-login">
              <Button variant="ghost" size="sm" className="text-sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-pink-500 hover:opacity-90 text-white border-0 gap-1.5 text-sm">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div aria-hidden className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(closest-side, #7c5cff, transparent)" }} />
        <div aria-hidden className="absolute -top-20 -right-40 w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(closest-side, #ec4899, transparent)" }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Claude AI
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            The AI studio built{" "}
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
              for YouTubers
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Script generation, SEO optimization, competitor analysis, bulk tag management
            and direct YouTube upload — all in one platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex h-12 w-full max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 text-sm outline-none"
              />
            </div>
            <Link to="/signup">
              <Button className="h-12 px-6 bg-gradient-to-r from-violet-600 to-pink-500 hover:opacity-90 text-white border-0 font-semibold gap-2 whitespace-nowrap">
                <Zap className="h-4 w-4" /> Start for free
              </Button>
            </Link>
          </div>

          <p className="mt-3 text-xs text-neutral-400">No credit card required · Free forever plan</p>

          {/* Social proof avatars */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {["#7c5cff","#ec4899","#3b82f6","#10b981","#f59e0b"].map((c, i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>
                  {["JD","SM","AR","KL","TB"][i]}
                </div>
              ))}
            </div>
            <div className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-900">2,400+</span> creators already using TubeMind
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-neutral-100 bg-gradient-to-r from-violet-50 via-white to-pink-50">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                  {value}
                </div>
                <div className="mt-1 text-sm text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 mb-4">
            <TrendingUp className="h-3 w-3" /> 10 powerful features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Everything your channel needs to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
              grow faster
            </span>
          </h2>
          <p className="mt-4 text-neutral-500">
            Replace 6 different tools with one platform. TubeMind does the heavy lifting so you can focus on creating.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, tag }) => (
            <div key={title}
              className="group relative rounded-2xl border border-neutral-200 bg-white p-6 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 transition-all duration-200">
              {tag && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {tag}
                </span>
              )}
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4 group-hover:from-violet-200 group-hover:to-pink-200 transition-colors">
                <Icon className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-gradient-to-br from-violet-50 via-white to-pink-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              How TubeMind works
            </h2>
            <p className="mt-4 text-neutral-500">From zero to optimized in 3 steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Chrome,
                title: "Connect your channel",
                desc: "Sign in with Google and give TubeMind access to your YouTube channel. The Chrome extension activates instantly.",
                color: "from-violet-500 to-violet-600",
              },
              {
                step: "02",
                icon: Brain,
                title: "Let AI analyze everything",
                desc: "Claude AI scans your videos, your competitors, trending topics and identifies every growth opportunity.",
                color: "from-pink-500 to-rose-600",
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Watch your channel grow",
                desc: "Apply suggestions with one click or let auto-optimize run weekly. Higher CTR, more views, less work.",
                color: "from-violet-600 to-pink-500",
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative">
                <div className="text-7xl font-extrabold text-neutral-100 absolute -top-4 -left-2">{step}</div>
                <div className="relative rounded-2xl bg-white border border-neutral-200 p-7 shadow-sm">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-neutral-500">Start free. Upgrade when you're ready to scale.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.highlight
                  ? "bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-2xl shadow-violet-200 scale-105"
                  : "border border-neutral-200 bg-white"
              }`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-amber-900 px-4 py-1 text-xs font-bold shadow-lg">
                  <Star className="h-3 w-3 fill-amber-900" /> Most popular
                </div>
              )}

              <div className={`text-sm font-semibold uppercase tracking-wide mb-2 ${plan.highlight ? "text-white/70" : "text-violet-600"}`}>
                {plan.name}
              </div>
              <div className={`text-4xl font-extrabold mb-1 ${plan.highlight ? "text-white" : "text-neutral-900"}`}>
                {plan.price}
                <span className={`text-base font-normal ${plan.highlight ? "text-white/60" : "text-neutral-400"}`}>{plan.period}</span>
              </div>
              <p className={`text-sm mb-6 ${plan.highlight ? "text-white/70" : "text-neutral-500"}`}>{plan.desc}</p>

              <Button
                className={`w-full h-11 font-semibold mb-6 ${
                  plan.highlight
                    ? "bg-white text-violet-600 hover:bg-white/90 border-0"
                    : "bg-gradient-to-r from-violet-600 to-pink-500 text-white border-0 hover:opacity-90"
                }`}>
                {plan.cta}
              </Button>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? "text-white/90" : "text-neutral-600"}`}>
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-white" : "text-violet-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-pink-600 text-white px-10 md:px-20 py-20 text-center shadow-2xl shadow-violet-200">
          <div aria-hidden className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl bg-white" />
          <div aria-hidden className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl bg-pink-300" />
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur">
                <Brain className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Ready to grow your channel?
            </h2>
            <p className="mt-4 text-white/70 max-w-lg mx-auto">
              Join 2,400+ creators who use TubeMind to save time, rank higher and grow faster on YouTube.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#pricing">
                <Button className="h-12 px-8 bg-white text-violet-700 hover:bg-white/90 border-0 font-bold gap-2">
                  <Zap className="h-4 w-4" /> Start for free — no card needed
                </Button>
              </a>
              <a href="#features">
                <Button variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 bg-transparent">
                  See all features
                </Button>
              </a>
            </div>
            <div className="mt-5 flex items-center justify-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Free forever plan</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-neutral-900">TubeMind</span>
            <span className="text-neutral-300">·</span>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-violet-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-violet-600 transition-colors">Pricing</a>
            <Link to="/newsletter" className="hover:text-violet-600 transition-colors">Newsletter</Link>
            <Link to="/login" className="hover:text-violet-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
