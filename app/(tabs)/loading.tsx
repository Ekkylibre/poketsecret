import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Reproduit exactement magasins-list.tsx ~L173-218 : le texte est calé en haut à
 *  gauche (justify-center dans une colonne py-3), et à droite Pin/Follow sont alignés
 *  en haut (self-start, PAS centrés) tandis que la colonne [ajouter, chevron] est
 *  centrée verticalement via le items-center du parent — les deux groupes de boutons
 *  n'ont donc pas le même alignement vertical entre eux, c'est voulu dans l'original. */
function StoreRowSkeleton() {
  return (
    <Card className="gap-0 p-3">
      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 pl-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <div className="flex items-center gap-1 py-3 pr-3">
          <Skeleton className="size-8 shrink-0 self-start rounded-md" />
          <Skeleton className="size-8 shrink-0 self-start rounded-md" />
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="size-8 shrink-0 rounded-md" />
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background sticky top-0 z-10 flex flex-col gap-3 p-4">
        {/* Input réel (rounded-md, pas pill) + bouton filtres (size-9) à côté, voir
            magasins-list.tsx ~L410-462. */}
        <div className="flex gap-2">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
          <Skeleton className="size-9 shrink-0 rounded-md" />
        </div>
        {/* Un seul chip par défaut ("X km") : les autres (type, série, langue...)
            n'apparaissent que si un filtre est actif, voir magasins-list.tsx. */}
        <Skeleton className="h-7 w-20 rounded-full" />
      </header>
      <div className="flex flex-col gap-2 p-4 pt-0">
        <Skeleton className="mb-1 h-4 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <StoreRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
