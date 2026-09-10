"use client";

import { Pin } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { togglePinStore } from "@/app/(tabs)/magasins/actions";
import { cn } from "@/lib/utils";

export function PinStoreButton({
  storeId,
  initialPinned,
  className,
}: {
  storeId: string;
  initialPinned: boolean;
  className?: string;
}) {
  const [pinned, setPinned] = useState(initialPinned);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      const result = await togglePinStore(storeId);
      if (result.error) {
        setPinned(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={pinned ? "Désépingler ce magasin" : "Épingler ce magasin"}
      aria-pressed={pinned}
      className={cn(
        "text-muted-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md disabled:opacity-50",
        pinned && "text-primary",
        className
      )}
    >
      <Pin className={cn("size-4", pinned && "fill-current")} />
    </button>
  );
}
