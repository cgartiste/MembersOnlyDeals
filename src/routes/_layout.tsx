import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { getMonthlyIncome } from "@/lib/mailgun.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("admin_user")) {
      throw redirect({ to: "/login" });
    }
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  const navigate = useNavigate();
  const fetchIncome = useServerFn(getMonthlyIncome);
  const { data: income } = useQuery({
    queryKey: ["monthly-income"],
    queryFn: () => fetchIncome(),
    refetchInterval: 60_000,
  });
  const revenue = income?.revenue ?? 0;

  function handleLogout() {
    localStorage.removeItem("admin_user");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-end gap-3 px-6">
          <div className="flex items-center gap-2 rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-3 py-1.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700/70 font-semibold">
                Income sponsors · mois
              </div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                ${revenue.toFixed(2)}
                <span className="ml-1.5 text-[10px] font-normal text-emerald-700/60">
                  {income?.sends ?? 0} envois
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1.5 text-xs">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">
              N
            </span>
            <span className="font-medium text-accent-foreground">Nexus AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </div>
  );
}
