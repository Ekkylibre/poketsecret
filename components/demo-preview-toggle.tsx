"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Sert uniquement à prévisualiser l'état "connecté" du profil sans vraie session (utile
// en dev tant que l'auth réelle n'est pas branchée partout). Un cookie, lu côté serveur
// par la page, pas une vraie authentification.
const COOKIE_NAME = "demo-preview-connected";

function setPreviewCookie(connected: boolean) {
  document.cookie = connected
    ? `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}`
    : `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function DemoPreviewToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setPreviewCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex shrink-0 items-center gap-2 text-xs">
      Aperçu &quot;connecté&quot;
      <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />
    </label>
  );
}

// Accessible depuis la page de connexion (seul endroit atteignable sans session) : active
// l'aperçu puis va directement sur /profil, plutôt qu'un simple switch qui laisserait sur
// place sans rien à prévisualiser.
export function DemoPreviewEnterLink() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setPreviewCookie(true);
    startTransition(() => router.push("/profil"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-muted-foreground text-center text-xs underline underline-offset-2 disabled:opacity-50"
    >
      Aperçu dev du profil (données mock)
    </button>
  );
}

export function DemoPreviewSignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setPreviewCookie(false);
    startTransition(() => router.refresh());
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={isPending}>
      Se déconnecter
    </Button>
  );
}
