import { MapPin, Phone, X } from "lucide-react";

import { likeStore, reportStore } from "@/app/(tabs)/magasins/actions";
import { ModifierMagasinDialog } from "@/components/nouveau-magasin-dialog";
import { SignalerMagasinDialog } from "@/components/signaler-magasin-dialog";
import { StoreVoteButtons } from "@/components/store-vote-buttons";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/confidence";
import { dayLabels, formatDayHours, weekdayOrder } from "@/lib/hours";
import { getUsername } from "@/lib/mock-data";
import type { Store } from "@/lib/types";
import { cn, formatStoreAddress } from "@/lib/utils";

export function StoreInfoPanel({
  store,
  onClose,
  className,
}: {
  store: Store;
  onClose: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{store.name}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="text-muted-foreground hover:bg-accent -mt-1 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <MapPin className="mt-0.5 size-3 shrink-0" />
        <span className="min-w-0">{formatStoreAddress(store)}</span>
      </p>
      {store.phone && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Phone className="size-3 shrink-0" />
          {store.phone}
        </p>
      )}

      {store.hours && (
        <div className="flex flex-col gap-0.5 text-[11px]">
          {weekdayOrder
            .filter((day) => store.hours![day])
            .map((day) => (
              <div key={day} className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{dayLabels[day].slice(0, 3)}</span>
                <span className="truncate">{formatDayHours(store.hours![day]!)}</span>
              </div>
            ))}
        </div>
      )}

      <p className="text-muted-foreground/70 text-xs">
        {store.lastModifiedById ? "Modifié par" : "Créé par"}{" "}
        {getUsername(store.lastModifiedById ?? store.createdById)} ·{" "}
        {relativeTime(store.lastModifiedById ? store.lastModifiedAt! : store.createdAt)}
      </p>

      <div className="flex items-center justify-between gap-2">
        <StoreVoteButtons
          storeId={store.id}
          likes={store.likes}
          reports={store.reports}
          likeAction={likeStore}
          reportAction={reportStore}
        />
        <div className="flex shrink-0 items-center gap-1">
          <SignalerMagasinDialog storeId={store.id} />
          <ModifierMagasinDialog store={store} />
        </div>
      </div>
    </Card>
  );
}
