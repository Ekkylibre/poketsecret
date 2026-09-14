import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Reproduit notification-row.tsx : photo à gauche pleine hauteur (w-24, pas un carré),
 *  badge + bouton fermer en haut à droite, 4 lignes de texte. La dernière ligne
 *  (auteur + palier + votes + confiance) est un flex-wrap qui s'enchaîne à la suite du
 *  texte auteur — rien n'est plaqué à droite, contrairement à un justify-between. */
function NotificationRowSkeleton() {
  return (
    <Card className="relative flex-row items-stretch gap-3 p-0">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="size-6 rounded-md" />
      </div>
      <Skeleton className="w-24 shrink-0 rounded-l-xl rounded-r-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-6">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="ml-2 h-3 w-6" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/** Skeleton pour un visiteur AVEC session (voir notifications/loading.tsx, qui choisit
 *  entre celui-ci et SignInFormSkeleton selon l'état de connexion) : reproduit la vraie
 *  page (page.tsx) pour un compte qui va effectivement voir ce contenu. */
export function NotificationsContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
