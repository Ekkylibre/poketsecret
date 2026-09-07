"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/server";
import { mockCurrentUser, mockStores } from "@/lib/mock-data";
import type { DayHours, Store, StoreHours, Weekday } from "@/lib/types";
import { PHONE_PATTERN } from "@/lib/utils";

const weekdays: Weekday[] = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

export interface CreerMagasinState {
  error?: string;
  success?: boolean;
}

export async function creerMagasin(
  _prevState: CreerMagasinState | null,
  formData: FormData
): Promise<CreerMagasinState> {
  // Auth désactivée temporairement en phase de test sur données mock.
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? mockCurrentUser.id;

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const postalCode = (formData.get("postalCode") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!name || !address || !city) {
    return { error: "Nom, adresse et ville sont obligatoires." };
  }

  if (phone && !new RegExp(PHONE_PATTERN).test(phone)) {
    return { error: "Numéro de téléphone invalide." };
  }

  const hours: StoreHours = {};
  for (const day of weekdays) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const morningOpen = (formData.get(`hours_${day}_morningOpen`) as string) || undefined;
    const morningClose = (formData.get(`hours_${day}_morningClose`) as string) || undefined;
    const afternoonOpen = (formData.get(`hours_${day}_afternoonOpen`) as string) || undefined;
    const afternoonClose = (formData.get(`hours_${day}_afternoonClose`) as string) || undefined;

    if (closed) {
      hours[day] = { closed: true };
      continue;
    }

    const dayHours: DayHours = { morningOpen, morningClose, afternoonOpen, afternoonClose };
    if (Object.values(dayHours).some(Boolean)) hours[day] = dayHours;
  }

  const store: Store = {
    id: randomUUID(),
    name,
    address,
    postalCode: postalCode || undefined,
    city,
    // Repli sur (0,0) si le magasin est ajouté sans passer par le pin sur la carte.
    lat: Number.isFinite(lat) && lat !== 0 ? lat : 0,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : 0,
    phone: phone || undefined,
    hours: Object.keys(hours).length > 0 ? hours : undefined,
    createdById: userId,
    createdAt: new Date().toISOString(),
    likes: 0,
    reports: 0,
    flags: 0,
  };

  mockStores.push(store);
  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}

/**
 * Met à jour un magasin existant (auteur et date de création d'origine conservés,
 * `lastModifiedById`/`lastModifiedAt` renseignés).
 */
export async function modifierMagasin(
  storeId: string,
  _prevState: CreerMagasinState | null,
  formData: FormData
): Promise<CreerMagasinState> {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? mockCurrentUser.id;

  const store = mockStores.find((s) => s.id === storeId);
  if (!store) {
    return { error: "Magasin introuvable." };
  }

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const postalCode = (formData.get("postalCode") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!name || !address || !city) {
    return { error: "Nom, adresse et ville sont obligatoires." };
  }

  if (phone && !new RegExp(PHONE_PATTERN).test(phone)) {
    return { error: "Numéro de téléphone invalide." };
  }

  const hours: StoreHours = {};
  for (const day of weekdays) {
    const closed = formData.get(`hours_${day}_closed`) === "on";
    const morningOpen = (formData.get(`hours_${day}_morningOpen`) as string) || undefined;
    const morningClose = (formData.get(`hours_${day}_morningClose`) as string) || undefined;
    const afternoonOpen = (formData.get(`hours_${day}_afternoonOpen`) as string) || undefined;
    const afternoonClose = (formData.get(`hours_${day}_afternoonClose`) as string) || undefined;

    if (closed) {
      hours[day] = { closed: true };
      continue;
    }

    const dayHours: DayHours = { morningOpen, morningClose, afternoonOpen, afternoonClose };
    if (Object.values(dayHours).some(Boolean)) hours[day] = dayHours;
  }

  store.name = name;
  store.address = address;
  store.postalCode = postalCode || undefined;
  store.city = city;
  if (Number.isFinite(lat) && lat !== 0) store.lat = lat;
  if (Number.isFinite(lng) && lng !== 0) store.lng = lng;
  store.phone = phone || undefined;
  store.hours = Object.keys(hours).length > 0 ? hours : undefined;
  store.lastModifiedById = userId;
  store.lastModifiedAt = new Date().toISOString();

  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}
