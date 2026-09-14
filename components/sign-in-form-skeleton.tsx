import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Chargement pour les routes réservées aux comptes connectés (/profil,
 *  /notifications) : contrairement à un skeleton qui imite la forme du vrai contenu
 *  (avatar, tableau de réputation, cartes de notification...), celui-ci reproduit
 *  l'écran de connexion (voir auth/sign-in/page.tsx). Ces deux pages redirigent
 *  systématiquement un visiteur sans session vers /auth/sign-in via un redirect() côté
 *  serveur qui n'arrive qu'après le premier rendu — sur une connexion lente, le fallback
 *  de chargement peut rester visible un instant avant cette redirection. Un skeleton de
 *  profil/notifications donnerait alors l'impression trompeuse d'un compte déjà connecté ;
 *  celui-ci annonce plutôt fidèlement ce qui arrive vraiment pour un visiteur. */
export function SignInFormSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo className="size-14 opacity-40" />
        <Skeleton className="h-4 w-28" />
      </div>

      <Card className="w-full max-w-sm gap-5 p-5">
        <Skeleton className="h-5 w-24" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">ou</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="mx-auto h-4 w-40" />
      </Card>
    </div>
  );
}
