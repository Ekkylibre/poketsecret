"use client";

import { Bell } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { unsuivreExtension } from "@/app/(tabs)/magasins/actions";
import { cn } from "@/lib/utils";

/** Toujours rendu en état "suivi" (jamais l'inverse : une extension retirée de la liste
 *  ne se re-suit pas depuis ici, seulement via le dialogue "Suivre un produit") — retire
 *  d'un coup tous les types suivis de cette série+extension (voir unsuivreExtension). */
export function UnfollowExtensionButton({
  series,
  setName,
  className,
}: {
  series: string;
  setName: string;
  className?: string;
}) {
  const [followed, setFollowed] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFollowed(false);
    startTransition(async () => {
      try {
        await unsuivreExtension(series, setName);
      } catch {
        setFollowed(true);
        toast.error("Impossible de retirer le suivi de cette extension.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || !followed}
      aria-label="Ne plus suivre cette extension"
      className={cn(
        "group flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50",
        followed ? "text-primary" : "text-foreground",
        className
      )}
    >
      <Bell
        className={cn("size-3.5 transition-colors group-hover:fill-white/25", followed && "fill-current")}
      />
    </button>
  );
}
