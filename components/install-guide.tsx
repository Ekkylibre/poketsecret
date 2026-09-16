"use client";

import { CircleCheck, PlusSquare, Share } from "lucide-react";
import { useSyncExternalStore } from "react";

type Platform = "ios" | "android" | "other";

// Aucun de ces deux signaux (UA, display-mode) ne peut se lire côté serveur ni au premier
// rendu client sans risquer un mismatch d'hydratation : même trick que
// notification-permission-toggle.tsx (useSyncExternalStore avec un abonnement neutre) pour
// laisser React réconcilier lui-même plutôt que de faire un setState dans un effet. Deux
// hooks séparés renvoyant des primitives (pas un objet {platform, standalone}) : un objet
// littéral recréé à chaque appel de getSnapshot/getServerSnapshot n'est jamais égal (par
// référence) à l'appel précédent, ce qui fait boucler React à l'infini.
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getPlatformSnapshot(): Platform {
  const ua = navigator.userAgent;
  // "MacIntel" + support tactile : couvre l'iPad qui s'annonce comme un Mac depuis
  // iPadOS 13 (masquage volontaire d'Apple pour recevoir les sites "desktop").
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  return /android/i.test(ua) ? "android" : "other";
}

function getPlatformServerSnapshot(): Platform {
  return "other";
}

function getStandaloneSnapshot(): boolean {
  // @ts-expect-error -- navigator.standalone est spécifique à Safari iOS, absent des types DOM standards.
  return navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function getStandaloneServerSnapshot(): boolean {
  return false;
}

/** Partagé avec install-app-link.tsx (lien "Installer l'app" du profil, masqué une fois
 *  l'app déjà installée). */
export function useIsStandalone() {
  return useSyncExternalStore(subscribe, getStandaloneSnapshot, getStandaloneServerSnapshot);
}

function Step({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        {icon}
      </div>
      <p className="mt-1.5 text-sm">{children}</p>
    </li>
  );
}

export function InstallGuide() {
  const platform = useSyncExternalStore(subscribe, getPlatformSnapshot, getPlatformServerSnapshot);
  const standalone = useIsStandalone();

  if (standalone) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <CircleCheck className="text-primary size-8" />
        <p className="text-sm font-medium">L&apos;app est déjà installée sur cet appareil.</p>
        <p className="text-muted-foreground text-sm">
          Retrouve-la depuis son icône sur l&apos;écran d&apos;accueil.
        </p>
      </div>
    );
  }

  if (platform === "ios") {
    return (
      <ol className="flex flex-col gap-4">
        <Step icon={<Share className="size-4" />}>
          Appuie sur le bouton <strong>Partager</strong> dans la barre Safari (le carré avec la
          flèche vers le haut).
        </Step>
        <Step icon={<PlusSquare className="size-4" />}>
          Fais défiler la liste et choisis <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </Step>
        <Step icon={<CircleCheck className="size-4" />}>
          Confirme en appuyant sur <strong>Ajouter</strong>, en haut à droite.
        </Step>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <ol className="flex flex-col gap-4">
        <Step icon={<Share className="size-4" />}>
          Appuie sur le menu <strong>⋮</strong> en haut à droite de Chrome.
        </Step>
        <Step icon={<PlusSquare className="size-4" />}>
          Choisis <strong>Installer l&apos;application</strong> (ou{" "}
          <strong>Ajouter à l&apos;écran d&apos;accueil</strong>).
        </Step>
        <Step icon={<CircleCheck className="size-4" />}>
          Confirme, l&apos;icône PoketSecret apparaît sur ton écran d&apos;accueil.
        </Step>
      </ol>
    );
  }

  return (
    <p className="text-muted-foreground text-center text-sm">
      Ouvre ce lien depuis ton téléphone pour installer l&apos;app sur son écran d&apos;accueil.
    </p>
  );
}
