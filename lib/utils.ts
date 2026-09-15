import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Store } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStoreAddress(store: Pick<Store, "address" | "postalCode" | "city">) {
  return store.postalCode
    ? `${store.address}, ${store.postalCode} ${store.city}`
    : `${store.address}, ${store.city}`;
}

const PSEUDO_DISPLAY_MAX_LENGTH = 12;

/** Tronque un pseudo affiché juste avant un badge de palier et une date (ex. "Créé par
 *  [pseudo] · 3 j") : contrairement à `truncate` (CSS) posé sur "pseudo · date" pris
 *  ensemble, qui peut couper l'ellipse avant même d'atteindre la date sur un pseudo long
 *  — la faisant disparaître complètement, surtout sur mobile — ceci ne raccourcit QUE le
 *  pseudo en amont, laissant le badge et la date toujours visibles derrière. */
export function truncatePseudo(pseudo: string, maxLength = PSEUDO_DISPLAY_MAX_LENGTH): string {
  return pseudo.length > maxLength ? `${pseudo.slice(0, maxLength)}…` : pseudo;
}

// Numéro français : 0X XX XX XX XX ou +33/0033 X XX XX XX XX, séparateurs espace/point/tiret optionnels.
export const PHONE_PATTERN = "^(?:(?:\\+33|0033)[\\s.-]?|0)[1-9](?:[\\s.-]?\\d{2}){4}$";
