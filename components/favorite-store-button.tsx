"use client";

import { Star } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";

import { toggleFavoriteStore } from "@/app/(tabs)/magasins/actions";
import { cn } from "@/lib/utils";

export function FavoriteStoreButton({
  storeId,
  initialFavorite,
  className,
}: {
  storeId: string;
  initialFavorite: boolean;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const result = await toggleFavoriteStore(storeId);
      if (result.error) setFavorite(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={favorite}
      className={cn(
        "text-muted-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md disabled:opacity-50",
        className
      )}
    >
      <Star className={cn("size-4", favorite && "fill-primary text-primary")} />
    </button>
  );
}
