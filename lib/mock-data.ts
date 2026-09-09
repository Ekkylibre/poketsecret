import type {
  Availability,
  AvailabilityReport,
  Product,
  Store,
  StoreReport,
  UserProfile,
} from "@/lib/types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

/** Jour calendaire précis (heure fixe) pour tester de façon déterministe les catégories
 *  de notifications (Aujourd'hui/Hier/7 derniers jours/Plus ancien), peu importe l'heure
 *  à laquelle le code tourne. */
const daysAgo = (d: number, h = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, 0, 0, 0);
  return date.toISOString();
};

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Booster",
    type: "booster",
    series: "Écarlate et Violet",
    setName: "151",
  },
  {
    id: "prod-2",
    name: "Coffret Dresseur d'Élite",
    type: "coffret",
    series: "Écarlate et Violet",
    setName: "151",
  },
  {
    id: "prod-3",
    name: "Display 36 boosters",
    type: "display",
    series: "Écarlate et Violet",
    setName: "Évolutions Prismatiques",
  },
  {
    id: "prod-4",
    name: "Étui de rangement",
    type: "autre",
    series: "Écarlate et Violet",
    setName: "151",
  },
  {
    id: "prod-5",
    name: "Coffret",
    type: "coffret",
    series: "Écarlate et Violet",
    setName: "Évolutions Prismatiques",
  },
  {
    id: "prod-6",
    name: "Blister 3 boosters",
    type: "booster",
    series: "Écarlate et Violet",
    setName: "182",
  },
];

export const mockStores: Store[] = [
  {
    id: "store-1",
    name: "Carrefour City",
    address: "12 rue de la République",
    postalCode: "69002",
    city: "Lyon",
    lat: 45.764,
    lng: 4.8357,
    phone: "04 78 00 00 00",
    hours: {
      lundi: { morningOpen: "09:00", morningClose: "12:30", afternoonOpen: "14:00", afternoonClose: "19:00" },
      mardi: { morningOpen: "09:00", morningClose: "12:30", afternoonOpen: "14:00", afternoonClose: "19:00" },
      mercredi: { morningOpen: "09:00", morningClose: "12:30", afternoonOpen: "14:00", afternoonClose: "19:00" },
      jeudi: { morningOpen: "09:00", morningClose: "12:30", afternoonOpen: "14:00", afternoonClose: "19:00" },
      vendredi: { morningOpen: "09:00", morningClose: "12:30", afternoonOpen: "14:00", afternoonClose: "19:00" },
      samedi: { morningOpen: "09:00", morningClose: "13:00" },
      dimanche: { closed: true },
    },
    createdById: "user-2",
    createdAt: hoursAgo(2400),
    likes: 6,
    reports: 0,
    flags: 0,
  },
  {
    id: "store-2",
    name: "Cultura Part-Dieu",
    address: "17 rue du Docteur Bouchut",
    postalCode: "69003",
    city: "Lyon",
    lat: 45.7607,
    lng: 4.8536,
    phone: "04 72 00 00 00",
    hours: {
      lundi: { morningOpen: "10:00", morningClose: "19:30" },
      mardi: { morningOpen: "10:00", morningClose: "19:30" },
      mercredi: { morningOpen: "10:00", morningClose: "19:30" },
      jeudi: { morningOpen: "10:00", morningClose: "19:30" },
      vendredi: { morningOpen: "10:00", morningClose: "19:30" },
      samedi: { morningOpen: "10:00", morningClose: "19:30" },
      dimanche: { closed: true },
    },
    createdById: "user-3",
    createdAt: hoursAgo(1500),
    likes: 3,
    reports: 1,
    flags: 0,
  },
  {
    id: "store-3",
    name: "Leclerc Villeurbanne",
    address: "8 avenue Henri Barbusse",
    postalCode: "69100",
    city: "Villeurbanne",
    lat: 45.7719,
    lng: 4.8902,
    createdById: "user-4",
    createdAt: hoursAgo(4000),
    likes: 1,
    reports: 0,
    flags: 0,
  },
];

export const mockAvailabilities: Availability[] = [
  {
    id: "avail-1",
    productId: "prod-1",
    storeId: "store-1",
    reportedById: "user-2",
    reportedAt: hoursAgo(2),
    lastConfirmedAt: hoursAgo(2),
    price: 4.5,
    language: "Français",
    quantity: "10+",
    nature: "Nouveau",
    baseConfidence: 90,
    confirmations: 4,
    disputes: 0,
    flags: 0,
  },
  {
    id: "avail-2",
    productId: "prod-3",
    storeId: "store-2",
    reportedById: "user-3",
    reportedAt: hoursAgo(30),
    price: 159,
    language: "Français",
    quantity: "1-5",
    nature: "Promo",
    baseConfidence: 75,
    confirmations: 1,
    disputes: 1,
    flags: 0,
  },
  {
    id: "avail-3",
    productId: "prod-2",
    storeId: "store-3",
    reportedById: "user-4",
    reportedAt: daysAgo(5),
    price: 89,
    language: "Français",
    quantity: "1-5",
    nature: "Réassort",
    baseConfidence: 60,
    confirmations: 0,
    disputes: 0,
    flags: 0,
  },
  {
    id: "avail-4",
    productId: "prod-4",
    storeId: "store-1",
    reportedById: "user-3",
    reportedAt: daysAgo(1),
    price: 15,
    language: "Français",
    quantity: "5-10",
    nature: "Réassort",
    baseConfidence: 70,
    confirmations: 2,
    disputes: 0,
    flags: 0,
  },
  {
    id: "avail-5",
    productId: "prod-5",
    storeId: "store-1",
    reportedById: "user-4",
    reportedAt: daysAgo(15),
    price: 45,
    language: "Anglais",
    quantity: "1-5",
    nature: "Promo",
    baseConfidence: 65,
    confirmations: 1,
    disputes: 0,
    flags: 0,
  },
  {
    id: "avail-6",
    productId: "prod-6",
    storeId: "store-1",
    reportedById: "user-2",
    reportedAt: hoursAgo(1),
    price: 12.5,
    language: "Japonais",
    quantity: "10+",
    nature: "Nouveau",
    baseConfidence: 88,
    confirmations: 3,
    disputes: 0,
    flags: 0,
  },
];

export const mockAvailabilityReports: AvailabilityReport[] = [];
export const mockStoreReports: StoreReport[] = [];

export const mockCurrentUser: UserProfile = {
  id: "user-1",
  username: "Didoux",
  reputation: 82,
  isPremium: true,
  followedProductIds: ["prod-1", "prod-2", "prod-4", "prod-5"],
  pinnedStoreIds: ["store-1"],
  followedStoreIds: ["store-1"],
  followedStoreSince: { "store-1": daysAgo(3) },
  dismissedNotificationIds: [],
  readNotificationIds: [],
};

/** Pseudo affiché pour un id utilisateur, pas encore de vraie table users côté mock. */
export const mockUsers: Record<string, string> = {
  "user-1": "Didoux",
  "user-2": "Marion_TCG",
  "user-3": "Kevin92",
  "user-4": "PokeHunter69",
};

export function getUsername(userId: string): string {
  return mockUsers[userId] ?? "Utilisateur";
}
