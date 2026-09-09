"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/logo";

const SPLASH_KEY = "poketsecret-splash-shown";
// Le double battement se termine vers ~1.3s (voir Logo -> WAVE_BEAT_GAP_S) ; on coupe
// juste après, sans attendre le long silence du reste du cycle de 3.2s.
const HOLD_MS = 1500;
const FADE_OUT_MS = 400;

// Lecture sessionStorage hydratation-safe (comme useNotificationPermission) : un
// useEffect + setState au montage déclencherait un setState synchrone dans l'effet
// (interdit par react-hooks/set-state-in-effect) et un flash serveur/client différent.
function subscribe() {
  return () => {};
}

function getShouldPlaySnapshot() {
  return sessionStorage.getItem(SPLASH_KEY) !== "1";
}

function getShouldPlayServerSnapshot() {
  return false;
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
      <Logo className="animate-splash-in aspect-square w-[clamp(140px,45vmin,320px)]" waves />
    </div>
  );
}
