"use client";

import { useTransition } from "react";

import { devTogglePremium } from "@/app/(tabs)/profil/actions";
import { Switch } from "@/components/ui/switch";

export function DevSimulatePremiumToggle({ checked }: { checked: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      await devTogglePremium(next);
    });
  }

  return (
    <div className="bg-muted flex items-center justify-between gap-3 rounded-md px-3 py-2">
      <p className="text-muted-foreground text-xs">Simuler un abonnement (dev, Stripe test)</p>
      <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />
    </div>
  );
}
