import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Carte : grande zone de carte en haut, puis le panneau de recherche/rayon en dessous
 *  (voir carte-explorer.tsx) — pas de barre de recherche flottante sur cette page-là,
 *  contrairement à /magasins. */
export default function Loading() {
  return (
    <div className="flex h-full flex-1 flex-col gap-4 p-4">
      <Skeleton className="min-h-48 flex-1 rounded-2xl" />
      <div className="flex min-h-80 gap-3">
        <Card className="min-w-0 flex-1 basis-0 gap-3 p-4">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="bg-background flex flex-col gap-1.5 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="mx-auto h-3 w-36" />
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </Card>
      </div>
    </div>
  );
}
