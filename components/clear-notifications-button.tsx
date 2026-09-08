"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

// Laisse le temps de re-cliquer pour confirmer, puis revient à l'icône seule si
// l'utilisateur change d'avis ou regarde ailleurs.
const CONFIRM_TIMEOUT = 2500;

export function ClearNotificationsButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [confirming]);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onConfirm();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Tout effacer"
      className="text-muted-foreground hover:bg-accent bg-background flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium"
    >
      {confirming ? (
        <span className="animate-slide-in-right">Tout effacer</span>
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </button>
  );
}
