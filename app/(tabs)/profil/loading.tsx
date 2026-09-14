import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  REPUTATION_MAX,
  TIER_THRESHOLD_CONFIRME,
  TIER_THRESHOLD_FIABLE,
} from "@/lib/reputation-constants";

const TABLE_COLUMNS = 5;

/** Ligne "magasin/produit suivi" (voir page.tsx) : jamais de vignette, juste du texte à
 *  gauche et un bouton suivre (size-9, voir follow-store-button.tsx) à droite. */
function FollowRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="size-9 shrink-0 rounded-md" />
    </div>
  );
}

/** Ligne de réglage (Changer le mot de passe, Supprimer mon compte, Aide...) : icône +
 *  libellé + chevron (size-4 chacun), voir change-password-dialog.tsx. */
function SettingRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <Skeleton className="h-3.5 flex-1" />
      <Skeleton className="size-4 shrink-0 rounded-sm" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* En-tête : mêmes classes que la vraie Card (page.tsx ~L165-199). */}
      <Card className="gap-0 p-0">
        <div className="flex items-stretch gap-3 px-4 pt-4 pb-3">
          <Skeleton className="size-28 shrink-0 self-center rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-6 shrink-0 rounded-md" />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Skeleton className="size-3 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-20" />
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ReputationCard : mêmes classes réelles (reputation-card.tsx), seuils réels pour
          positionner les repères de palier exactement où ils tombent en vrai. */}
      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>

        <div>
          <div className="relative h-1.5 py-2">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="relative mt-1 h-3.5">
            <Skeleton
              className="absolute h-2.5 w-12"
              style={{ left: "0%" }}
            />
            <Skeleton
              className="absolute h-2.5 w-14"
              style={{ left: `${(TIER_THRESHOLD_CONFIRME / REPUTATION_MAX) * 100}%` }}
            />
            <Skeleton
              className="absolute h-2.5 w-10"
              style={{ left: `${(TIER_THRESHOLD_FIABLE / REPUTATION_MAX) * 100}%` }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b text-[10px]">
                <th className="py-1 pl-1 text-left">
                  <Skeleton className="h-2.5 w-10" />
                </th>
                {Array.from({ length: TABLE_COLUMNS - 1 }, (_, i) => (
                  <th key={i} className="py-1 text-center">
                    <Skeleton className="mx-auto h-2.5 w-8" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }, (_, row) => (
                <tr key={row} className="border-b last:border-0">
                  <td className="py-1.5 pl-1">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="size-3.5 shrink-0 rounded-sm" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </td>
                  {Array.from({ length: TABLE_COLUMNS - 1 }, (_, i) => (
                    <td key={i} className="py-1.5 text-center">
                      <Skeleton className="mx-auto h-3 w-6" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Formules : mêmes Card/gap/p que page.tsx (~L206-272), sans le toggle "Simuler un
          abonnement" (dev only, retiré en prod). */}
      <div>
        <Skeleton className="mb-2 h-4 w-20" />
        <div className="flex items-stretch gap-3">
          <Card className="min-w-0 flex-1 basis-0 gap-3 p-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-14" />
              </div>
              <Skeleton className="h-3.5 w-8" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          </Card>
          <Card className="min-w-0 flex-1 basis-0 gap-3 p-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="mt-1 h-9 w-full rounded-md" />
          </Card>
        </div>
      </div>

      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <div className="flex flex-col gap-2">
          <Card className="p-3">
            <FollowRowSkeleton />
          </Card>
          <Card className="p-3">
            <FollowRowSkeleton />
          </Card>
        </div>
      </div>

      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <Card className="gap-0 px-3 py-1">
          <FollowRowSkeleton />
          <Separator />
          <FollowRowSkeleton />
        </Card>
      </div>

      <div>
        <Skeleton className="mb-2 h-4 w-16" />
        <Card className="gap-0 px-4 py-1">
          <SettingRowSkeleton />
          <Separator />
          <SettingRowSkeleton />
        </Card>
      </div>

      <Card className="gap-0 p-0">
        <SettingRowSkeleton />
      </Card>
    </div>
  );
}
