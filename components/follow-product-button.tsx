"use client";

import { Bell } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";

import { toggleFollowProduct } from "@/app/(tabs)/magasins/actions";
import { cn } from "@/lib/utils";

export function FollowProductButton({
  productId,
  initialFollowed,
  className,
}: {
  productId: string;
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
      const result = await toggleFollowProduct(productId);
      if (result.error) setFollowed(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={followed ? "Ne plus suivre ce produit" : "Suivre ce produit"}
      aria-pressed={followed}
      className={cn(
        "group flex size-6 shrink-0 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm disabled:opacity-50",
        followed ? "text-primary" : "text-foreground",
        className
      )}
    >
      <Bell
        className={cn(
          "size-3.5 transition-colors group-hover:fill-white/25",
          followed && "fill-current"
        )}
      />
    </button>
  );
}
