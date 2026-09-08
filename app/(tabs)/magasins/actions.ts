"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/server";
import {
  mockAvailabilities,
  mockAvailabilityReports,
  mockCurrentUser,
  mockProducts,
  mockStoreReports,
  mockStores,
} from "@/lib/mock-data";
import { productTypeLabels, quantityOptions } from "@/lib/product-options";
import type {
  Availability,
  AvailabilityNature,
  AvailabilityReport,
  Product,
  ProductType,
  QuantityRange,
  StoreReport,
} from "@/lib/types";

export async function likeStore(storeId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "Connecte-toi pour liker un magasin." };
  }

  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  store.likes += 1;
  revalidatePath("/");
  return { success: true };
}

export async function reportStore(storeId: string) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "Connecte-toi pour signaler un magasin." };
  }

  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  store.reports += 1;
  revalidatePath("/");
  return { success: true };
}

export interface SignalementMagasinFormState {
  error?: string;
  success?: boolean;
}

export async function signalerMagasin(
  storeId: string,
  _prevState: SignalementMagasinFormState | null,
  formData: FormData
): Promise<SignalementMagasinFormState> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? mockCurrentUser.id;

  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  const reason = (formData.get("reason") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim();
  if (!reason) {
    return { error: "Choisis une raison." };
  }

  const report: StoreReport = {
    id: randomUUID(),
    storeId,
    reason,
    comment: comment || undefined,
    reportedById: userId,
    reportedAt: new Date().toISOString(),
  };
  mockStoreReports.push(report);
  store.flags += 1;

  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}

/** Épingler = mise en avant/accès rapide uniquement, aucune notification associée. */
export async function togglePinStore(storeId: string) {
  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  const index = mockCurrentUser.pinnedStoreIds.indexOf(storeId);
  if (index === -1) {
    mockCurrentUser.pinnedStoreIds.push(storeId);
  } else {
    mockCurrentUser.pinnedStoreIds.splice(index, 1);
  }

  revalidatePath("/magasins");
  revalidatePath("/profil");
  return { success: true, pinned: index === -1 };
}

/** Suivi = déclenche les notifications de réassort pour ce magasin, indépendant du favori. */
export async function toggleFollowStore(storeId: string) {
  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  const index = mockCurrentUser.followedStoreIds.indexOf(storeId);
  if (index === -1) {
    mockCurrentUser.followedStoreIds.push(storeId);
    mockCurrentUser.followedStoreSince[storeId] = new Date().toISOString();
  } else {
    mockCurrentUser.followedStoreIds.splice(index, 1);
    delete mockCurrentUser.followedStoreSince[storeId];
  }

  revalidatePath("/magasins");
  revalidatePath("/notifications");
  revalidatePath("/profil");
  return { success: true, followed: index === -1 };
}

export async function toggleFollowProduct(productId: string) {
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) {
    return { error: "Produit introuvable." };
  }

  const index = mockCurrentUser.followedProductIds.indexOf(productId);
  if (index === -1) {
    mockCurrentUser.followedProductIds.push(productId);
  } else {
    mockCurrentUser.followedProductIds.splice(index, 1);
  }

  revalidatePath("/magasins");
  revalidatePath("/notifications");
  revalidatePath("/profil");
  return { success: true, followed: index === -1 };
}

export interface SuivreProduitFormState {
  error?: string;
  success?: boolean;
}

/**
 * Enregistre un ou plusieurs produits (un par type coché) dans le catalogue — créés s'ils
 * n'existent pas déjà — et les suit, sans passer par un signalement de dispo, pour pouvoir
 * suivre un produit avant qu'il n'ait été vu en magasin par qui que ce soit.
 */
export async function suivreNouveauProduit(
  _prevState: SuivreProduitFormState | null,
  formData: FormData
): Promise<SuivreProduitFormState> {
  const series = (formData.get("series") as string)?.trim();
  const setName = (formData.get("setName") as string)?.trim();
  const types = formData.getAll("type") as string[];

  if (!series) {
    return { error: "La série est obligatoire." };
  }
  if (!setName) {
    return { error: "L'extension est obligatoire." };
  }
  if (types.length === 0) {
    return { error: "Choisis au moins un type." };
  }

  for (const typeRaw of types) {
    const type = (typeRaw || "autre") as ProductType;
    const product = findOrCreateProduct(productTypeLabels[type], series, setName, type);
    if (!mockCurrentUser.followedProductIds.includes(product.id)) {
      mockCurrentUser.followedProductIds.push(product.id);
    }
  }

  revalidatePath("/magasins");
  revalidatePath("/notifications");
  revalidatePath("/profil");
  return { success: true };
}

export interface ProduitFormState {
  error?: string;
  success?: boolean;
}

function findOrCreateProduct(
  name: string,
  series: string,
  setName: string,
  type: ProductType
): Product {
  const existing = mockProducts.find(
    (p) =>
      p.name.trim().toLowerCase() === name.toLowerCase() &&
      p.series.trim().toLowerCase() === series.toLowerCase() &&
      p.setName.trim().toLowerCase() === setName.toLowerCase()
  );
  if (existing) return existing;

  const product: Product = { id: randomUUID(), name, type, series, setName };
  mockProducts.push(product);
  return product;
}

/**
 * Crée une nouvelle disponibilité, ou met à jour celle désignée par `availabilityId`
 * (auteur et date de signalement d'origine conservés).
 */
export async function enregistrerProduit(
  storeId: string,
  availabilityId: string | null,
  _prevState: ProduitFormState | null,
  formData: FormData
): Promise<ProduitFormState> {
  // Auth désactivée temporairement en phase de test sur données mock.
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? mockCurrentUser.id;

  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  const natureRaw = (formData.get("nature") as string)?.trim();
  const nature = (natureRaw || undefined) as AvailabilityNature | undefined;
  const priceRaw = (formData.get("price") as string)?.trim();
  const quantityRaw = (formData.get("quantity") as string)?.trim();

  if (!nature) {
    return { error: "La nature est obligatoire." };
  }
  if (!quantityRaw) {
    return { error: "La quantité est obligatoire." };
  }
  if (!quantityOptions.includes(quantityRaw as QuantityRange)) {
    return { error: "Quantité invalide." };
  }
  const quantity = quantityRaw as QuantityRange;
  const isRupture = quantity === "Rupture";

  // Un produit en rupture n'a pas de prix affiché.
  let price: number | undefined;
  if (!isRupture) {
    if (!priceRaw) {
      return { error: "Le prix est obligatoire." };
    }
    price = Math.round(Number(priceRaw) * 100) / 100;
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Prix invalide." };
    }
  }

  if (availabilityId) {
    // Édition : seuls nature, prix et quantité changent — le produit
    // (type/série/extension/langue) et la photo restent ceux d'origine.
    const availability = mockAvailabilities.find((a) => a.id === availabilityId);
    if (!availability) {
      return { error: "Disponibilité introuvable." };
    }
    availability.price = price;
    availability.quantity = quantity;
    availability.nature = nature;
    availability.lastModifiedById = userId;
    availability.lastModifiedAt = new Date().toISOString();
  } else {
    const series = (formData.get("series") as string)?.trim();
    const setName = (formData.get("setName") as string)?.trim();
    const type = ((formData.get("type") as string) || "autre") as ProductType;
    const language = (formData.get("language") as string)?.trim();
    const photoUrl = (formData.get("photoUrl") as string)?.trim();

    if (!series) {
      return { error: "La série est obligatoire." };
    }
    if (!setName) {
      return { error: "L'extension est obligatoire." };
    }
    if (!language) {
      return { error: "La langue est obligatoire." };
    }
    if (!photoUrl) {
      return { error: "Une photo est obligatoire." };
    }

    const product = findOrCreateProduct(productTypeLabels[type], series, setName, type);

    const isDuplicate = mockAvailabilities.some(
      (a) => a.productId === product.id && a.storeId === storeId
    );
    if (isDuplicate) {
      return {
        error:
          "Ce produit est déjà référencé dans ce magasin. Confirme l'annonce existante plutôt que d'en créer une nouvelle.",
      };
    }

    const availability: Availability = {
      id: randomUUID(),
      productId: product.id,
      storeId,
      reportedById: userId,
      reportedAt: new Date().toISOString(),
      price,
      quantity,
      language,
      nature,
      photoUrl,
      baseConfidence: mockCurrentUser.reputation,
      confirmations: 0,
      disputes: 0,
      flags: 0,
    };
    mockAvailabilities.push(availability);
  }

  revalidatePath("/magasins");
  return { success: true };
}

export type VoteValue = "confirm" | "dispute" | null;

/**
 * Retire `previousVote` et applique `newVote` en une seule fois, pour permettre
 * de changer d'avis (basculer confirm <-> dispute) ou de retirer son vote (newVote: null).
 */
export async function voterDisponibilite(
  availabilityId: string,
  previousVote: VoteValue,
  newVote: VoteValue
) {
  const availability = mockAvailabilities.find((a) => a.id === availabilityId);
  if (!availability) {
    return { error: "Disponibilité introuvable." };
  }

  if (previousVote === "confirm") availability.confirmations = Math.max(0, availability.confirmations - 1);
  if (previousVote === "dispute") availability.disputes = Math.max(0, availability.disputes - 1);

  if (newVote === "confirm") {
    availability.confirmations += 1;
    availability.lastConfirmedAt = new Date().toISOString();
  }
  if (newVote === "dispute") availability.disputes += 1;

  revalidatePath("/magasins");
  return { success: true };
}

export async function togglePinDisponibilite(availabilityId: string) {
  const availability = mockAvailabilities.find((a) => a.id === availabilityId);
  if (!availability) {
    return { error: "Disponibilité introuvable." };
  }

  availability.pinned = !availability.pinned;
  revalidatePath("/magasins");
  return { success: true, pinned: availability.pinned };
}

export interface SignalementFormState {
  error?: string;
  success?: boolean;
}

export async function signalerDisponibilite(
  availabilityId: string,
  _prevState: SignalementFormState | null,
  formData: FormData
): Promise<SignalementFormState> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? mockCurrentUser.id;

  const availability = mockAvailabilities.find((a) => a.id === availabilityId);
  if (!availability) {
    return { error: "Disponibilité introuvable." };
  }

  const reason = (formData.get("reason") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim();
  if (!reason) {
    return { error: "Choisis une raison." };
  }

  const report: AvailabilityReport = {
    id: randomUUID(),
    availabilityId,
    reason,
    comment: comment || undefined,
    reportedById: userId,
    reportedAt: new Date().toISOString(),
  };
  mockAvailabilityReports.push(report);
  availability.flags += 1;

  revalidatePath("/magasins");
  return { success: true };
}
