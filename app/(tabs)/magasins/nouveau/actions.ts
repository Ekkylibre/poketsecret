"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/require-session";
import { sql } from "@/lib/db";
import { parseHoursFromFormData } from "@/lib/hours";
import { ensureProfil } from "@/lib/profil";
import {
  countEditsMagasinAutresToday,
  countMagasinsCetteSemaine,
  DAILY_LIMITS,
  MAGASIN_PAR_SEMAINE,
  REPUTATION_START,
  tierOf,
} from "@/lib/reputation";
import { PHONE_PATTERN } from "@/lib/utils";

async function getReputation(userId: string): Promise<number> {
  const rows = await sql`select reputation from public.profils_utilisateurs where id = ${userId}`;
  return (rows[0] as { reputation: number } | undefined)?.reputation ?? REPUTATION_START;
}

export interface CreerMagasinState {
  error?: string;
  success?: boolean;
}

export async function creerMagasin(
  _prevState: CreerMagasinState | null,
  formData: FormData
): Promise<CreerMagasinState> {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

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

  const tier = tierOf(await getReputation(user.id));
  const cetteSemaine = await countMagasinsCetteSemaine(user.id);
  if (cetteSemaine >= MAGASIN_PAR_SEMAINE[tier]) {
    return { error: "Tu as atteint ta limite d'ajout de magasins pour cette semaine." };
  }

  const hours = parseHoursFromFormData(formData);
  const hasHours = Object.keys(hours).length > 0;

  // Repli sur (0,0) si le magasin est ajouté sans passer par le pin sur la carte.
  const latValue = Number.isFinite(lat) && lat !== 0 ? lat : 0;
  const lngValue = Number.isFinite(lng) && lng !== 0 ? lng : 0;

  await sql`
    insert into public.magasins (nom, adresse, code_postal, ville, latitude, longitude, telephone, horaires, cree_par)
    values (
      ${name}, ${address}, ${postalCode || null}, ${city}, ${latValue}, ${lngValue},
      ${phone || null}, ${hasHours ? JSON.stringify(hours) : null}::jsonb, ${user.id}
    )
  `;

  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}

/**
 * Met à jour un magasin existant (auteur et date de création d'origine conservés,
 * `modifie_par`/`modifie_le` renseignés).
 */
export async function modifierMagasin(
  storeId: string,
  _prevState: CreerMagasinState | null,
  formData: FormData
): Promise<CreerMagasinState> {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const existingRows = await sql`select cree_par from public.magasins where id = ${storeId}`;
  const createurId = (existingRows[0] as { cree_par: string | null } | undefined)?.cree_par;
  if (existingRows.length === 0) {
    return { error: "Magasin introuvable." };
  }

  // Modifier le magasin de quelqu'un d'autre est réservé à Confirmé+ et soumis au même
  // quota que les modifications d'annonces d'autrui (voir enregistrerProduit) : sans ça,
  // un compte tout juste créé pourrait défigurer n'importe quel magasin.
  if (createurId !== user.id) {
    const tier = tierOf(await getReputation(user.id));
    if (tier === "nouveau") {
      return { error: "Il faut être au moins Confirmé pour modifier le magasin de quelqu'un d'autre." };
    }
    const used = await countEditsMagasinAutresToday(user.id);
    if (used >= DAILY_LIMITS[tier].editsAutres) {
      return { error: "Tu as atteint ta limite de modifications de magasins d'autrui pour aujourd'hui." };
    }
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

  const hours = parseHoursFromFormData(formData);
  const hasHours = Object.keys(hours).length > 0;
  const hasCoords = Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0;

  const rows = await sql`
    update public.magasins
    set nom = ${name},
        adresse = ${address},
        code_postal = ${postalCode || null},
        ville = ${city},
        telephone = ${phone || null},
        horaires = ${hasHours ? JSON.stringify(hours) : null}::jsonb,
        latitude = case when ${hasCoords} then ${lat} else latitude end,
        longitude = case when ${hasCoords} then ${lng} else longitude end,
        modifie_par = ${user.id},
        modifie_le = now()
    where id = ${storeId}
    returning id
  `;
  if (rows.length === 0) {
    return { error: "Magasin introuvable." };
  }

  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}
