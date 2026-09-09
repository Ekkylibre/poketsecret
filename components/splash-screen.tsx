"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/logo";

const SPLASH_KEY = "poketsecret-splash-shown";
const HOLD_MS = 1500;
const FADE_OUT_MS = 400;

// Variable de module (pas un state React) : une fois qu'on a décidé de lancer la lecture
// pour ce chargement de page, on ignore toute relecture ultérieure de sessionStorage.
// Sans ça, l'écriture faite dans l'effet ci-dessous (sessionStorage.setItem) serait
// relue par un contrôle de cohérence ultérieur de useSyncExternalStore (React revérifie
// le snapshot après tout effet, encore plus en Strict Mode), verrait "déjà joué" à cause
// de notre propre écriture, et couperait le splash presque immédiatement au lieu de
// tenir HOLD_MS. Se réinitialise naturellement à chaque rechargement complet de page
// (le module est réévalué), donc sans effet sur le cas légitime "déjà joué lors d'un
// chargement précédent de cette session" : cette correction-là a lieu avant que notre
// effet ait la moindre chance de s'exécuter.
let playRequestedThisLoad = false;

// Lecture sessionStorage hydratation-safe (comme useNotificationPermission) : un
// useEffect + setState au montage déclencherait un setState synchrone dans l'effet
// (interdit par react-hooks/set-state-in-effect) et un flash serveur/client différent.
function subscribe() {
  return () => {};
}

function getShouldPlaySnapshot() {
  if (playRequestedThisLoad) return true;
  return sessionStorage.getItem(SPLASH_KEY) !== "1";
}

// true, pas false : le serveur ne peut pas savoir si sessionStorage a déjà la clé (elle
// n'existe que côté navigateur), donc le premier rendu doit supposer qu'il faut jouer le
// splash. Sinon la première peinture montre l'app, puis l'hydratation corrige vers "il
// faut jouer le splash" un instant plus tard : c'est le flash app → splash → app.
function getShouldPlayServerSnapshot() {
  return true;
}

export function SplashScreen() {
  // Une fois par session de navigation plutôt qu'une fois pour toutes : rejoue à chaque
  // nouvel onglet/redémarrage du navigateur, comme l'écran de lancement d'une app native.
  const shouldPlay = useSyncExternalStore(
    subscribe,
    getShouldPlaySnapshot,
    getShouldPlayServerSnapshot
  );
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!shouldPlay) return;
    playRequestedThisLoad = true;
    sessionStorage.setItem(SPLASH_KEY, "1");
    const leaveTimer = setTimeout(() => setLeaving(true), HOLD_MS);
    const removeTimer = setTimeout(() => setDone(true), HOLD_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [shouldPlay]);

  if (!shouldPlay || done) return null;

  return (
    <div
      className={`bg-background fixed inset-0 z-50 flex items-center justify-center ${leaving ? "animate-splash-out" : ""}`}
    >
      {/* clamp plutôt qu'une taille fixe : proportionnel à l'écran (vmin gère aussi bien
          portrait que paysage), avec un plancher/plafond pour rester raisonnable. */}
      <Logo className="animate-splash-in aspect-square w-[clamp(140px,45vmin,320px)]" shimmer />
    </div>
  );
}
