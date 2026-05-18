import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminLogin } from "@/lib/auth.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — PipeSend" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("admin_user")) throw redirect({ to: "/administrator/dashboard" });
  },
  component: LoginPage,
});

const USERS = ["tarik", "said", "nabil"] as const;

function LoginPage() {
  const navigate = useNavigate();
  const loginFn = useServerFn(adminLogin);
  const [username, setUsername] = useState<string>("tarik");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginFn({ data: { username, password } });
      localStorage.setItem("admin_user", result.username);
      window.location.href = "/administrator/dashboard";
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold">Administrator</h1>
          <p className="text-sm text-muted-foreground mt-1">PipeSend — accès restreint</p>
        </div>
        <div className="space-y-2">
          <Label>Utilisateur</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          >
            {USERS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
