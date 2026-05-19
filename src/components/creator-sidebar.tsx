import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain, BarChart3, Sparkles, TrendingUp, Search, Tag,
  RefreshCw, Package, Bell, Upload, CalendarDays, Chrome,
  LogOut, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const CREATOR_NAV = [
  { icon: BarChart3,    label: "Dashboard",          to: "/dashboard" },
  { icon: Sparkles,     label: "Script AI",           to: "/script" },
  { icon: TrendingUp,   label: "SEO Optimizer",       to: "/seo" },
  { icon: Search,       label: "Competitor Research", to: "/competitors" },
  { icon: Tag,          label: "Tag Manager",         to: "/tag-manager" },
  { icon: RefreshCw,    label: "Auto-Optimize",       to: "/auto-optimize" },
  { icon: Package,      label: "Bulk Update",         to: "/tag-manager" },
  { icon: Bell,         label: "Tag Alerts",          to: "/alerts" },
  { icon: Upload,       label: "Upload Manager",      to: "/upload" },
  { icon: CalendarDays, label: "Content Calendar",    to: "/calendar" },
  { icon: Chrome,       label: "Chrome Extension",    to: "/extension" },
  { icon: Settings,     label: "Paramètres",          to: "/creator-settings" },
] as const;

type Session = { id?: string; name?: string | null; plan?: string };

export function CreatorSidebar({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-neutral-200 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-100">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-extrabold tracking-tight">
          Tube<span className="text-violet-600">Mind</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {CREATOR_NAV.map(({ icon: Icon, label, to }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <Link key={label} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-violet-50 text-violet-700 font-semibold"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}>
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-600" : ""}`} />
              <span className="flex-1 truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-100 space-y-3">
        {session.plan === "free" && (
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 p-3 text-white text-xs">
            <div className="font-bold mb-0.5">Plan Free</div>
            <div className="opacity-80 mb-2">Passez en Creator pour tout débloquer</div>
            <Link to="/creator-settings">
              <Button size="sm" className="w-full h-7 bg-white text-violet-700 hover:bg-white/90 border-0 text-xs font-semibold">
                Upgrade — $19/mois
              </Button>
            </Link>
          </div>
        )}
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors">
          <LogOut className="h-3.5 w-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
