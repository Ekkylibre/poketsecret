export type ProductType = "booster" | "coffret" | "display" | "autre";

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  /** Série TCG, ex. "Écarlate et Violet" — regroupe plusieurs extensions. */
  series: string;
  /** Extension précise au sein de la série, ex. "151" ou "Évolutions Prismatiques". */
  setName: string;
  imageUrl?: string;
}

export type Weekday =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

export interface DayHours {
  closed?: boolean;
  /** Créneaux au format "HH:MM". */
  morningOpen?: string;
  morningClose?: string;
  afternoonOpen?: string;
  afternoonClose?: string;
}

export type StoreHours = Partial<Record<Weekday, DayHours>>;

export interface Store {
  id: string;
  name: string;
  address: string;
  postalCode?: string;
  city: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: StoreHours;
  createdById: string;
  createdAt: string; // ISO date
  lastModifiedById?: string;
  lastModifiedAt?: string; // ISO date
  likes: number;
  reports: number;
  flags: number;
}

export interface StoreReport {
  id: string;
  storeId: string;
  reason: string;
  comment?: string;
  reportedById: string;
  reportedAt: string; // ISO date
}

export type AvailabilityNature = "Nouveau" | "Promo" | "Réassort";

/** Tranche de quantité déclarée, plutôt qu'un nombre exact ; "Rupture" = plus de stock. */
export type QuantityRange = "1-5" | "5-10" | "10+" | "Rupture";

export interface Availability {
  id: string;
  productId: string;
  storeId: string;
  reportedById: string;
  reportedAt: string; // ISO date
  lastConfirmedAt?: string; // ISO date
  lastModifiedById?: string;
  lastModifiedAt?: string; // ISO date
  price?: number;
  language?: string;
  quantity?: QuantityRange;
  photoUrl?: string;
  nature?: AvailabilityNature;
  pinned?: boolean;
  /** Fiabilité déclarée au moment du signalement (0-100), avant décroissance. */
  baseConfidence: number;
  confirmations: number;
  disputes: number;
  flags: number;
}

export interface AvailabilityReport {
  id: string;
  availabilityId: string;
  reason: string;
  comment?: string;
  reportedById: string;
  reportedAt: string; // ISO date
}

export interface UserProfile {
  id: string;
  username: string;
  /** Réputation du contributeur (0-100), basée sur l'historique de ses signalements. */
  reputation: number;
  isPremium: boolean;
  followedProductIds: string[];
  favoriteStoreIds: string[];
  /** Disponibilités masquées du flux de notifications (fermées manuellement). */
  dismissedNotificationIds: string[];
}
