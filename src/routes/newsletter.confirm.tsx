import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, Gift } from "lucide-react";
import { confirmSubscription } from "@/lib/subscribers.functions";

export const Route = createFileRoute("/newsletter/confirm")({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Inscription confirmée — Members Only Deals" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useSearch();
  const confirm = useServerFn(confirmSubscription);

  const q = useQuery({
    queryKey: ["confirm", token],
    queryFn: () => confirm({ data: { token: token! } }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-pink-50 px-4 py-16">
      {/* Logo / Brand */}
      <div className="mb-10 flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          Members Only Deals
        </span>
      </div>

      <div className="w-full max-w-md">
        {/* Pas de token */}
        {!token && <ErrorCard title="Lien invalide" message="Ce lien de confirmation est incomplet ou expiré." showResubscribe />}

        {/* Chargement */}
        {token && q.isPending && (
          <Card>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="h-16 w-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
              <p className="text-muted-foreground text-sm">Confirmation en cours…</p>
            </div>
          </Card>
        )}

        {/* Erreur réseau */}
        {token && q.isError && (
          <ErrorCard
            title="Une erreur est survenue"
            message="Impossible de confirmer votre inscription pour le moment. Réessayez dans quelques instants."
            showResubscribe
          />
        )}

        {/* Déjà confirmé */}
        {token && q.data?.ok && q.data.already && (
          <Card>
            <div className="flex flex-col items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Déjà inscrit·e !</h1>
                <p className="text-muted-foreground text-sm">
                  L'adresse <strong className="text-foreground">{q.data.email}</strong> est déjà confirmée.
                  Vous recevrez nos prochaines offres exclusives directement.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                Retour à l'accueil <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        )}

        {/* Confirmation réussie */}
        {token && q.data?.ok && !q.data.already && (
          <Card>
            <div className="flex flex-col items-center gap-6">
              {/* Icône succès animée */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs shadow">
                  ✓
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                  Bienvenue !
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Votre adresse <strong className="text-foreground">{q.data.email}</strong> est confirmée.
                  Un email de bienvenue vient de vous être envoyé.
                </p>
              </div>

              {/* Ce qui vous attend */}
              <div className="w-full rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <Gift className="h-4 w-4" /> Ce qui vous attend
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    Offres exclusives en avant-première
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    Deals privés réservés aux membres
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    Aucun spam — désinscription en 1 clic
                  </li>
                </ul>
              </div>

              <Link
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white px-6 py-3 text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity"
              >
                Voir nos offres <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="text-xs text-muted-foreground text-center">
                Pour vous désinscrire à tout moment, cliquez sur le lien en bas de nos emails.
              </p>
            </div>
          </Card>
        )}

        {/* Token invalide */}
        {token && q.data && !q.data.ok && (
          <ErrorCard
            title="Lien expiré ou invalide"
            message="Ce lien de confirmation n'est plus valide. Inscrivez-vous à nouveau pour recevoir un nouveau lien."
            showResubscribe
          />
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-white shadow-xl p-8">
      {children}
    </div>
  );
}

function ErrorCard({ title, message, showResubscribe }: { title: string; message: string; showResubscribe?: boolean }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-rose-500" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        {showResubscribe && (
          <Link
            to="/newsletter"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            <Mail className="h-4 w-4" /> S'inscrire à nouveau
          </Link>
        )}
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Retour à l'accueil
        </Link>
      </div>
    </Card>
  );
}
