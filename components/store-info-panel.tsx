"use client";

import { MapPin, Phone, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

import { likeStore, reportStore } from "@/app/(tabs)/magasins/actions";
import { ModifierMagasinDialog } from "@/components/nouveau-magasin-dialog";
import { SignalerMagasinDialog } from "@/components/signaler-magasin-dialog";
import { StoreVoteButtons } from "@/components/store-vote-buttons";
import { TierBadge } from "@/components/tier-badge";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/confidence";
import { dayLabels, formatDayHours, weekdayOrder } from "@/lib/hours";
import type { AuthorInfo } from "@/lib/queries";
import type { Store } from "@/lib/types";
import { cn, formatStoreAddress } from "@/lib/utils";

export function StoreInfoPanel({
  store,
  onClose,
  className,
  authorPseudos,
}: {
  store: Store;
  onClose: () => void;
  className?: string;
  authorPseudos: Record<string, AuthorInfo>;
}) {
  const [closing, setClosing] = useState(false);
  const author = authorPseudos[store.lastModifiedById ?? store.createdById];

  return (
    <Card
      className={cn(closing ? "animate-panel-slide-out" : "animate-panel-slide-in", "gap-3 p-4", className)}
      onAnimationEnd={() => {
        if (closing) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{store.name}</p>
        <button
          type="button"
          onClick={() => setClosing(true)}
          aria-label="Fermer la fiche"
          className="text-muted-foreground hover:bg-accent -mt-1 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {store.masked && (
        <div className="bg-destructive/15 text-destructive flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium">
          <TriangleAlert className="size-3 shrink-0" />
          Masqué par la communauté, vote encore possible
        </div>
      )}

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

      <p className="text-muted-foreground/70 flex min-w-0 items-center gap-1 text-xs">
        {store.lastModifiedById ? "Modifié par" : "Créé par"}
        {author && <TierBadge tier={author.tier} />}
        <span className="min-w-0 truncate">
          {author?.pseudo ?? "Utilisateur"} ·{" "}
          {relativeTime(store.lastModifiedById ? store.lastModifiedAt! : store.createdAt)}
        </span>
      </p>

      <div className="mt-auto flex items-center justify-between gap-2">
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
