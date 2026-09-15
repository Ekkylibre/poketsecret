"use client";

import { MapPin, Package, Phone, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { likeStore, reportStore, signalerMagasin, signalerPseudo } from "@/app/(tabs)/magasins/actions";
import { ModifierMagasinDialog } from "@/components/nouveau-magasin-dialog";
import { SignalerMenu } from "@/components/signaler-menu";
import { StoreVoteButtons } from "@/components/store-vote-buttons";
import { TierBadge } from "@/components/tier-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/confidence";
import { dayLabels, formatDayHours, weekdayOrder } from "@/lib/hours";
import type { AuthorInfo } from "@/lib/queries";
import type { Store } from "@/lib/types";
import { cn, formatStoreAddress, truncatePseudo } from "@/lib/utils";

// Adresse/horaires retirés : se corrigent directement via "Modifier le magasin", plus
// besoin de les signaler (même logique que pour les produits, voir availability-card.tsx).
const STORE_REPORT_REASONS = ["Magasin fermé définitivement", "Doublon", "Contenu inapproprié ou spam"];

export function StoreInfoPanel({
  store,
  onClose,
  className,
  authorPseudos,
  currentUser,
}: {
  store: Store;
  onClose: () => void;
  className?: string;
  authorPseudos: Record<string, AuthorInfo>;
  currentUser?: AuthorInfo;
}) {
  const [closing, setClosing] = useState(false);
  const authorId = store.lastModifiedById ?? store.createdById;
  const author = authorPseudos[authorId];

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
                {/* Pas de truncate : les horaires sont l'info qu'on vient chercher ici, les
                    perdre derrière "…" sur un panneau étroit serait pire qu'un retour à la
                    ligne (voir le fix de layout carte-explorer.tsx pour la cause première). */}
                <span className="min-w-0 text-right">{formatDayHours(store.hours![day]!)}</span>
              </div>
            ))}
        </div>
      )}

      <p className="text-muted-foreground/70 flex items-center gap-1 overflow-hidden text-xs whitespace-nowrap">
        {store.lastModifiedById ? "Modifié par" : "Créé par"}{" "}
        {truncatePseudo(author?.pseudo ?? "Utilisateur")}
        {author && <TierBadge tier={author.tier} isAdmin={author.isAdmin} />}
        <span className="shrink-0">
          · {relativeTime(store.lastModifiedById ? store.lastModifiedAt! : store.createdAt)}
        </span>
      </p>

      {/* Depuis la carte, on sait déjà OÙ est le magasin ; ce bouton répond à la
          question suivante "qu'est-ce qu'il y a dedans" en renvoyant vers la liste, qui
          seule affiche prix/photos/stock. Réutilise le même paramètre ?store= que les
          notifications (voir notification-row.tsx, lib/push.ts) : magasins-list.tsx
          scroll et déplie déjà automatiquement le bon magasin à partir de ce paramètre. */}
      <Button asChild variant="outline" className="w-full">
        <Link href={`/?store=${store.id}`}>
          <Package className="size-4" />
          Voir les produits
        </Link>
      </Button>

      <div className="mt-auto flex items-center justify-between gap-2">
        <StoreVoteButtons
          storeId={store.id}
          likes={store.likes}
          reports={store.reports}
          likeAction={likeStore}
          reportAction={reportStore}
        />
        <div className="flex shrink-0 items-center gap-1">
          <SignalerMenu
            contentTitle="Signaler ce magasin"
            contentReasons={STORE_REPORT_REASONS}
            contentAction={signalerMagasin.bind(null, store.id)}
            pseudoAction={author && !author.isAdmin ? signalerPseudo.bind(null, authorId) : undefined}
          />
          <ModifierMagasinDialog store={store} currentUser={currentUser} />
        </div>
      </div>
    </Card>
  );
}
