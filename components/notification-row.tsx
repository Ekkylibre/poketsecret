"use client";

import { ImageOff, Store as StoreIcon, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type PointerEvent, useEffect, useRef, useState, useTransition } from "react";

import { dismissNotification } from "@/app/(tabs)/notifications/actions";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { decayedConfidence, relativeTime } from "@/lib/confidence";
import { languageAbbreviations, natureStyles } from "@/lib/product-options";
import type { Availability, Product, Store } from "@/lib/types";
import { cn, formatStoreAddress } from "@/lib/utils";

// Distance de glissement (px) à partir de laquelle relâcher le doigt supprime la notification.
const SWIPE_DISMISS_THRESHOLD = 88;

export function NotificationRow({
  availability,
  product,
  store,
  isRead,
  exitDelayMs,
  authorPseudos,
}: {
  availability: Availability;
  product: Product;
  store: Store;
  isRead: boolean;
  /** "Tout effacer" : fait jouer la sortie (fade + slide) après ce délai, pour un effet
   *  en cascade plutôt que toutes les notifs qui disparaissent d'un coup. */
  exitDelayMs?: number;
  authorPseudos: Record<string, string>;
}) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Le slide+fade masque la carte, mais tant que la ligne occupe encore sa hauteur (gap du
  // parent compris), les cartes suivantes ne remontent pas, d'où un saut de mise en page
  // brutal dès que la ligne se démonte. On effondre donc sa hauteur juste après, avant de
  // la retirer du DOM, pour que les voisines remontent en douceur plutôt que d'un coup.
  const [collapsing, setCollapsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (exitDelayMs === undefined) return;
    const timeout = setTimeout(() => {
      setDragging(false);
      setRemoving(true);
    }, exitDelayMs);
    return () => clearTimeout(timeout);
  }, [exitDelayMs]);

  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  // Verrouille le geste sur un axe dès qu'il est détecté, pour ne pas intercepter le
  // scroll vertical de la liste tout en gérant le swipe horizontal.
  const axisRef = useRef<"x" | "y" | null>(null);

  const confidence = decayedConfidence(availability.baseConfidence, availability.reportedAt);

  const editedById = availability.lastModifiedById;
  const authorLabel = editedById
    ? `Modifié par ${authorPseudos[editedById] ?? "Utilisateur"}`
    : `Créé par ${authorPseudos[availability.reportedById] ?? "Utilisateur"}`;
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

    // Aucun axe verrouillé = le doigt/curseur n'a quasiment pas bougé : c'est un tap, pas un
    // swipe ni un scroll, donc on ouvre le magasin au bon produit.
    const wasTap = axisRef.current === null;
    axisRef.current = null;

    if (wasTap) {
      router.push(`/magasins?store=${store.id}&dispo=${availability.id}`);
      return;
    }

    if (dragX <= -SWIPE_DISMISS_THRESHOLD) {
      commitDismiss();
    } else {
      setDragX(0);
    }
  }

  if (removed) return null;

  const revealProgress = removing ? 1 : Math.min(1, Math.abs(dragX) / SWIPE_DISMISS_THRESHOLD);

  return (
    <div
      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
      style={{ gridTemplateRows: collapsing ? "0fr" : "1fr" }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "grid-template-rows" && collapsing) setRemoved(true);
      }}
    >
      <div className="relative min-h-0 overflow-hidden rounded-xl">
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
          onTransitionEnd={(e) => {
            if (e.propertyName === "transform" && removing) setCollapsing(true);
          }}
          style={{
            transform: `translateX(${removing ? "-110%" : `${dragX}px`})`,
            opacity: removing ? 0 : 1,
            transition: dragging
              ? "none"
              : removing
                ? "transform 0.2s ease-out, opacity 0.2s ease-out"
                : "transform 0.25s ease-out, opacity 0.25s ease-out",
            touchAction: "pan-y",
          }}
          className={cn(
            "relative z-10 flex-row items-stretch gap-3 border-transparent p-0 transition-colors",
            !isRead && "bg-primary/10 border-primary/15"
          )}
        >
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            {availability.nature && (
              <Badge className={cn("border-transparent", natureStyles[availability.nature])}>
                {availability.nature}
              </Badge>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={commitDismiss}
              aria-label="Fermer la notification"
              className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Largeur fixe (contrairement à un aspect-square calé sur la hauteur de la card,
              qui grandirait avec le texte et recouvrirait celui-ci) mais hauteur qui suit
              la card via items-stretch (pas de self-start) : la largeur ne dépendant plus
              de la hauteur, il n'y a plus de dépendance circulaire à craindre. */}
          <div className="bg-muted text-muted-foreground relative flex w-24 shrink-0 items-center justify-center overflow-hidden rounded-l-xl">
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
              <ImageOff className="size-8" aria-label="Pas encore de photo" />
            )}
          </div>

          <div className="min-w-0 flex-1 py-3 pr-6">
            <p className="line-clamp-1 pr-20 text-sm font-semibold">
              {/* Point avant le titre plutôt qu'une barre sur le bord de la card : celle-ci
                  chevauchait la photo (rounded-l-xl commun aux deux). */}
              {!isRead && (
                <span
                  aria-hidden
                  className="bg-primary mr-1.5 inline-block size-1.5 shrink-0 rounded-full align-middle"
                />
              )}
              {product.name} {product.setName}
              {availability.price != null && availability.quantity !== "Rupture" && (
                <span> · {availability.price} €</span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-muted-foreground truncate text-xs">{product.series}</p>
              {availability.language && (
                <Badge variant="outline" className="shrink-0">
                  {languageAbbreviations[availability.language] ?? availability.language}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
              <StoreIcon className="size-3 shrink-0" />
              {store.name}, {formatStoreAddress(store)}
            </p>
            <div className="text-muted-foreground/70 mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="truncate">
                {authorLabel} · {authorTime}
              </span>
              {/* ml-2 en plus du gap du parent : espace visiblement plus large avant le
                  cluster votes/confiance, pour le distinguer du bloc auteur/durée. */}
              <span className="ml-2 flex shrink-0 items-center gap-0.5">
                <ThumbsUp className="size-3" />
                {availability.confirmations}
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <ThumbsDown className="size-3" />
                {availability.disputes}
              </span>
              <ConfidenceBadge confidence={confidence} className="h-4 px-1 py-0 text-[10px] leading-none" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
