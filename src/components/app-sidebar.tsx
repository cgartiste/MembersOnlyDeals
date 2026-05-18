import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Send,
  Users,
  FileText,
  BarChart3,
  Package,
  PlusSquare,
  Briefcase,
  MessageSquare,
  Plane,
  Mail,
} from "lucide-react";

const sections: {
  label: string;
  accent: string;
  items: { title: string; url: string; icon: typeof LayoutDashboard; enabled?: boolean }[];
}[] = [
  {
    label: "Overview",
    accent: "text-muted-foreground",
    items: [{ title: "Dashboard", url: "/administrator/dashboard", icon: LayoutDashboard, enabled: true }],
  },
  {
    label: "Mailgun",
    accent: "text-[oklch(0.55_0.22_25)]",
    items: [
      { title: "Mailing", url: "/administrator/mailing", icon: Mail, enabled: true },
      { title: "Envoi & stats", url: "/administrator/mailgun", icon: Send, enabled: true },
      { title: "Subscribers", url: "/administrator/subscribers", icon: Users, enabled: true },
      { title: "Templates", url: "/templates", icon: FileText },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Store",
    accent: "text-[oklch(0.62_0.2_50)]",
    items: [
      { title: "Landings", url: "/administrator/landings", icon: Package, enabled: true },
      { title: "Add Product", url: "/administrator/add-product", icon: PlusSquare, enabled: true },
      { title: "Sponsors", url: "/administrator/sponsors", icon: Briefcase, enabled: true },
    ],
  },
  {
    label: "Nexus AI",
    accent: "text-[oklch(0.65_0.25_350)]",
    items: [{ title: "Chat", url: "/chat", icon: MessageSquare }],
  },
  {
    label: "Admin",
    accent: "text-muted-foreground",
    items: [{ title: "Settings", url: "/administrator/settings", icon: SettingsIcon, enabled: true }],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-white">PipeSend</div>
          <div className="text-[11px] text-sidebar-foreground/60">Email Marketing Platform</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <div
              className={`px-3 mb-2 text-[11px] font-semibold tracking-widest uppercase ${section.accent}`}
            >
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.url;
                const Icon = item.icon;
                return (
                  <li key={item.url}>
                    <Link
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-primary/90 text-primary-foreground shadow-md shadow-primary/30"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
                      } ${item.enabled === false ? "opacity-60" : ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-sidebar-border flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
          N
        </div>
        <div className="flex-1 text-sm">
          <div className="text-white">admin</div>
          <div className="text-[11px] text-sidebar-foreground/60">PipeSend</div>
        </div>
      </div>
    </aside>
  );
}