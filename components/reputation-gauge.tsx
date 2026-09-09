"use client";

import { type MouseEvent, useState } from "react";

import {
  REPUTATION_MAX,
  TIER_THRESHOLD_CONFIRME,
  TIER_THRESHOLD_FIABLE,
} from "@/lib/reputation-constants";
import { cn } from "@/lib/utils";

/** Jauge de réputation : la position survolée (pas juste la valeur actuelle) indique sa
 *  propre valeur 0-100, pour se repérer sur l'échelle plutôt que de deviner à l'oeil où
 *  tombent les seuils. */
export function ReputationGauge({ reputation }: { reputation: number }) {
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverPercent(Math.min(100, Math.max(0, Math.round(ratio * 100))));
  }

  return (
    <div
      className="relative h-1.5 cursor-crosshair py-2"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPercent(null)}
    >
      <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${(reputation / REPUTATION_MAX) * 100}%` }}
        />
        {/* Délimite les 3 segments de la jauge, pas juste un pourcentage continu. */}
        {[TIER_THRESHOLD_CONFIRME, TIER_THRESHOLD_FIABLE].map((mark) => (
          <div
            key={mark}
            aria-hidden
            className="bg-background/70 absolute inset-y-0 w-px"
            style={{ left: `${(mark / REPUTATION_MAX) * 100}%` }}
          />
        ))}
      </div>

      {/* Seuils toujours visibles au-dessus de la barre (pas besoin de survoler), séparés
          du nom du palier qui reste affiché en dessous. */}
      {[TIER_THRESHOLD_CONFIRME, TIER_THRESHOLD_FIABLE].map((mark) => (
        <span
          key={mark}
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute -top-3 -translate-x-1/2 text-[9px] tabular-nums"
          style={{ left: `${(mark / REPUTATION_MAX) * 100}%` }}
        >
          {mark}
        </span>
      ))}

      {hoverPercent !== null && (
        <>
          <div
            aria-hidden
            className="bg-foreground pointer-events-none absolute top-0 h-1.5 w-px"
            style={{ left: `${hoverPercent}%` }}
          />
          <div
            className={cn(
              "bg-popover text-popover-foreground pointer-events-none absolute -top-7 -translate-x-1/2",
              "rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow-md"
            )}
            style={{ left: `${hoverPercent}%` }}
          >
            {hoverPercent}
          </div>
        </>
      )}
    </div>
  );
}
