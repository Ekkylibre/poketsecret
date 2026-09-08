"use client";

import { ImageOff, MapPin, Package, Pin, ThumbsDown, ThumbsUp } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";

import { togglePinDisponibilite, voterDisponibilite } from "@/app/(tabs)/magasins/actions";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { FollowProductButton } from "@/components/follow-product-button";
import { ModifierProduitDialog } from "@/components/produit-dialog";
import { SignalerDialog } from "@/components/signaler-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { decayedConfidence, relativeTime } from "@/lib/confidence";
import { getUsername } from "@/lib/mock-data";
import { languageAbbreviations, natureStyles } from "@/lib/product-options";
import type { Availability, Product, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AvailabilityCard({
  availability,
  product,
  store,
  storeId,
  products,
  isFollowed,
  highlighted,
}: {
  availability: Availability;
  product: Product;
  /** Omis quand la carte est affichée dans le contexte d'une fiche magasin. */
  store?: Store;
  storeId: string;
  products: Product[];
  isFollowed: boolean;
  /** Venue d'une notification qui pointe vers cette dispo précise. */
  highlighted?: boolean;
}) {
  const confidence = decayedConfidence(availability.baseConfidence, availability.reportedAt);
  const [isPending, startTransition] = useTransition();
  const [confirmations, setConfirmations] = useState(availability.confirmations);
  const [disputes, setDisputes] = useState(availability.disputes);
  const [voted, setVoted] = useState<"confirm" | "dispute" | null>(null);
  const [pinned, setPinned] = useState(availability.pinned ?? false);

  function handleVote(kind: "confirm" | "dispute") {
    const previousVote = voted;
    const newVote = previousVote === kind ? null : kind;

    if (previousVote === "confirm") setConfirmations((c) => c - 1);
    if (previousVote === "dispute") setDisputes((d) => d - 1);
    if (newVote === "confirm") setConfirmations((c) => c + 1);
    if (newVote === "dispute") setDisputes((d) => d + 1);
    setVoted(newVote);

    startTransition(async () => {
      await voterDisponibilite(availability.id, previousVote, newVote);
    });
  }

  function handlePin(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      const result = await togglePinDisponibilite(availability.id);
      if (result.error) setPinned(!next);
    });
  }

  const editedById = availability.lastModifiedById;
  const authorLabel = editedById
    ? `Modifié par ${getUsername(editedById)}`
    : `Créé par ${getUsername(availability.reportedById)}`;
  const authorTime = relativeTime(editedById ? availability.lastModifiedAt! : availability.reportedAt);

  return (
    <Card
      id={`dispo-${availability.id}`}
      className={cn(
        "group/card hover:bg-white/5 animate-fade-in-up relative h-full gap-1.5 overflow-hidden p-2 transition-colors",
        highlighted && "shimmer-wrapper"
      )}
    >
      <div className="bg-muted text-muted-foreground relative -mx-2 -mt-2 flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-t-xl">
        {availability.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL locale, pas d'optimisation next/image possible
          <img
            src={availability.photoUrl}
            alt={product.name}
            className={cn(
              "h-full w-full object-cover",
              availability.quantity === "Rupture" && "grayscale"
            )}
          />
        ) : (
          <ImageOff className="size-10" aria-label="Pas encore de photo" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-white/0 transition-colors group-hover/card:bg-white/5" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <FollowProductButton productId={product.id} initialFollowed={isFollowed} />
          <button
            type="button"
            onClick={handlePin}
            aria-label={pinned ? "Désépingler" : "Épingler"}
            aria-pressed={pinned}
            className={cn(
              "group flex size-6 shrink-0 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm",
              pinned ? "text-primary" : "text-foreground"
            )}
          >
            <Pin
              className={cn(
                "size-3.5 transition-colors group-hover:fill-white/25",
                pinned && "fill-current"
              )}
            />
          </button>
          {availability.nature && (
            <Badge className={cn("border-transparent", natureStyles[availability.nature])}>
              {availability.nature}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-h-10 items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold">
            {product.name} {product.setName}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {availability.price != null && availability.quantity !== "Rupture" && (
              <span className="text-sm font-semibold">{availability.price} €</span>
            )}
            {availability.quantity != null && (
              <Badge variant="secondary" className="gap-1">
                <Package className="size-3" />
                {availability.quantity}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex min-h-5 flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{product.series}</span>
          {availability.language && (
            <Badge variant="outline" className="shrink-0">
              {languageAbbreviations[availability.language] ?? availability.language}
            </Badge>
          )}
        </div>
        {store && (
          <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <MapPin className="size-3 shrink-0" />
            {store.name}, {store.city}
          </p>
        )}
        <div className="flex min-h-5 flex-wrap items-center gap-1">
          <span className="text-muted-foreground/70 truncate text-xs">
            {authorLabel} · {authorTime}
          </span>
        </div>
        <div className="mt-auto flex flex-nowrap items-center gap-0 pt-0.5">
          <div className="flex items-center">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleVote("confirm")}
              aria-label={voted === "confirm" ? "Retirer ma confirmation" : "Confirmer cette disponibilité"}
              aria-pressed={voted === "confirm"}
              className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
            >
              <ThumbsUp className={cn("size-3", voted === "confirm" && "fill-primary text-primary")} />
            </button>
            <span className="text-muted-foreground text-[11px] tabular-nums">{confirmations}</span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleVote("dispute")}
              aria-label={voted === "dispute" ? "Retirer ma contestation" : "Contester cette disponibilité"}
              aria-pressed={voted === "dispute"}
              className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
            >
              <ThumbsDown className={cn("size-3", voted === "dispute" && "fill-current")} />
            </button>
            <span className="text-muted-foreground text-[11px] tabular-nums">{disputes}</span>
          </div>
          <ConfidenceBadge
            confidence={confidence}
            className="ml-2 h-4 px-0.5 py-0 text-[10px] leading-none"
          />
          <SignalerDialog availabilityId={availability.id} />
          <ModifierProduitDialog
            storeId={storeId}
            products={products}
            availability={availability}
            product={product}
            size="sm"
          />
        </div>
      </div>
    </Card>
  );
}
