"use client";

import { Bell } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";

import { toggleFollowStore } from "@/app/(tabs)/magasins/actions";
import { cn } from "@/lib/utils";

export function FollowStoreButton({
  storeId,
  initialFollowed,
  className,
}: {
  storeId: string;
  initialFollowed: boolean;
  className?: string;
}) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !followed;
    setFollowed(next);
    startTransition(async () => {
      const result = await toggleFollowStore(storeId);
      if (result.error) setFollowed(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={followed ? "Ne plus suivre ce magasin" : "Suivre ce magasin"}
      aria-pressed={followed}
      className={cn(
        "text-muted-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md disabled:opacity-50",
        followed && "text-primary",
        className
      )}
    >
      <Bell className={cn("size-4", followed && "fill-current")} />
    </button>
  );
}
