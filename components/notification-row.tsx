"use client";

import { ImageOff, MapPin, Package, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { type PointerEvent, useRef, useState, useTransition } from "react";

import { dismissNotification } from "@/app/(tabs)/notifications/actions";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { decayedConfidence, relativeTime } from "@/lib/confidence";
import { getUsername } from "@/lib/mock-data";
import { languageAbbreviations, natureStyles } from "@/lib/product-options";
import type { Availability, Product, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

// Distance de glissement (px) à partir de laquelle relâcher le doigt supprime la notification.
const SWIPE_DISMISS_THRESHOLD = 88;

export function NotificationRow({
  availability,
  product,
  store,
}: {
  availability: Availability;
  product: Product;
  store: Store;
}) {
  const [removed, setRemoved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [, startTransition] = useTransition();

  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  // Verrouille le geste sur un axe dès qu'il est détecté, pour ne pas intercepter le
  // scroll vertical de la liste tout en gérant le swipe horizontal.
  const axisRef = useRef<"x" | "y" | null>(null);

  const confidence = decayedConfidence(availability.baseConfidence, availability.reportedAt);

  const editedById = availability.lastModifiedById;
  const authorLabel = editedById
    ? `Modifié par ${getUsername(editedById)}`
    : `Créé par ${getUsername(availability.reportedById)}`;
  const authorTime = relativeTime(editedById ? availability.lastModifiedAt! : availability.reportedAt);

  function commitDismiss() {
    setDragging(false);
    setRemoving(true);
    startTransition(async () => {
      await dismissNotification(availability.id);
    });
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (removing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    axisRef.current = null;
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (axisRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axisRef.current !== "x") return;

    e.preventDefault();
    setDragX(Math.min(0, dx));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);

    if (axisRef.current === "x" && dragX <= -SWIPE_DISMISS_THRESHOLD) {
      commitDismiss();
    } else {
      setDragX(0);
    }
    axisRef.current = null;
  }

  if (removed) return null;

  const revealProgress = removing ? 1 : Math.min(1, Math.abs(dragX) / SWIPE_DISMISS_THRESHOLD);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="bg-destructive/20 text-destructive absolute inset-0 flex items-center justify-end pr-4 transition-opacity"
        style={{ opacity: revealProgress }}
      >
        <Trash2 className="size-4" />
      </div>

      <Card
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTransitionEnd={() => {
          if (removing) setRemoved(true);
        }}
        style={{
          transform: `translateX(${removing ? "-110%" : `${dragX}px`})`,
          opacity: removing ? 0 : 1,
          transition: dragging ? "none" : "transform 0.25s ease-out, opacity 0.25s ease-out",
          touchAction: "pan-y",
        }}
        className="relative z-10 flex-row items-center gap-3 p-3"
      >
        <button
          type="button"
          onClick={commitDismiss}
          aria-label="Fermer la notification"
          className="text-muted-foreground hover:bg-accent absolute top-2 right-2 flex size-6 shrink-0 items-center justify-center rounded-md"
        >
          <X className="size-3.5" />
        </button>

        <div className="bg-muted text-muted-foreground relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
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
            <ImageOff className="size-5" aria-label="Pas encore de photo" />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <p className="line-clamp-1 text-sm font-semibold">
            {product.name} {product.setName}
            {availability.price != null && availability.quantity !== "Rupture" && (
              <span> · {availability.price} €</span>
            )}
          </p>
          <p className="text-muted-foreground truncate text-xs">{product.series}</p>
          <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <MapPin className="size-3 shrink-0" />
            {store.name}, {store.city}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {availability.nature && (
              <Badge className={cn("border-transparent", natureStyles[availability.nature])}>
                {availability.nature}
              </Badge>
            )}
            {availability.language && (
              <Badge variant="outline">
                {languageAbbreviations[availability.language] ?? availability.language}
              </Badge>
            )}
            {availability.quantity && (
              <Badge variant="secondary" className="gap-1">
                <Package className="size-3" />
                {availability.quantity}
              </Badge>
            )}
            <ConfidenceBadge confidence={confidence} className="h-4 px-1 py-0 text-[10px] leading-none" />
          </div>
          <div className="text-muted-foreground/70 mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="truncate">
              {authorLabel} · {authorTime}
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <ThumbsUp className="size-3" />
              {availability.confirmations}
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <ThumbsDown className="size-3" />
              {availability.disputes}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
