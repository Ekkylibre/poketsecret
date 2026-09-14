"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Évite de recharger à chaque bref retour si l'utilisateur jongle entre deux apps en
// quelques secondes : pas la peine de refaire une requête à chaque aller-retour rapide.
const MIN_INTERVAL_MS = 10_000;

/** Recharge les données serveur de la page actuelle quand l'onglet/l'app redevient
 *  visible après être passé en arrière-plan (pas de polling ni de temps réel, voir
 *  discussion : juste "frais au retour" plutôt que figé sur les données du dernier
 *  chargement). router.refresh() ne perd pas l'état client (scroll, dialogs ouverts). */
export function RefreshOnVisible() {
  const router = useRouter();
  // 0 plutôt que Date.now() ici : un appel impur (horloge) est interdit au rendu (règle
  // de pureté des hooks React) ; 0 fait qu'un premier retour d'arrière-plan déclenche
  // toujours un refresh, ce qui est le comportement voulu de toute façon.
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_INTERVAL_MS) return;
      lastRefreshRef.current = now;
      router.refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  return null;
}
