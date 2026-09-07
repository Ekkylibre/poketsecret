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

// Numéro français : 0X XX XX XX XX ou +33/0033 X XX XX XX XX, séparateurs espace/point/tiret optionnels.
export const PHONE_PATTERN = "^(?:(?:\\+33|0033)[\\s.-]?|0)[1-9](?:[\\s.-]?\\d{2}){4}$";
