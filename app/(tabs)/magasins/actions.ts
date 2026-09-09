"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/require-session";
import { sql } from "@/lib/db";
import { ensureProfil } from "@/lib/profil";
import { productTypeLabels, quantityOptions } from "@/lib/product-options";
import {
  countEditsAutresToday,
  countSignalementsToday,
  countVotesToday,
  DAILY_LIMITS,
  REPUTATION_START,
  resetDisponibiliteResolution,
  resolveDisponibiliteVote,
  resolveMagasinVote,
  tierOf,
} from "@/lib/reputation";
import type { AvailabilityNature, ProductType, QuantityRange } from "@/lib/types";

// Raisons affichées côté UI (signaler-dialog.tsx / signaler-magasin-dialog.tsx) mappées
// vers les motifs/catégories acceptés en base (contraintes CHECK), pour ne pas avoir à
// toucher ces composants pour ce changement de stockage.
const MOTIF_DISPO: Record<string, string> = {
  "Produit ou photo incorrect(e)": "produit_photo",
  Doublon: "doublon",
  "Contenu inapproprié ou spam": "inapproprie",
  Autre: "autre",
};
const CATEGORIE_MAGASIN: Record<string, string> = {
  "Magasin fermé définitivement": "ferme",
  Doublon: "doublon",
  "Contenu inapproprié ou spam": "inapproprie",
};

async function getReputation(userId: string): Promise<number> {
  const rows = await sql`select reputation from public.profils_utilisateurs where id = ${userId}`;
  return (rows[0] as { reputation: number } | undefined)?.reputation ?? REPUTATION_START;
}

/** Retourne un message d'erreur si le palier de l'utilisateur ne l'autorise plus à
 *  voter/signaler aujourd'hui, sinon null. Compte à partir des tables de vote
 *  elles-mêmes plutôt qu'un compteur séparé, pour ne jamais désynchroniser. */
async function checkVoteQuota(userId: string): Promise<string | null> {
  const tier = tierOf(await getReputation(userId));
  const used = await countVotesToday(userId);
  if (used >= DAILY_LIMITS[tier].votes) {
    return "Tu as atteint ta limite de votes pour aujourd'hui.";
  }
  return null;
}

async function checkSignalementQuota(userId: string): Promise<string | null> {
  const tier = tierOf(await getReputation(userId));
  const used = await countSignalementsToday(userId);
  if (used >= DAILY_LIMITS[tier].signalements) {
    return "Tu as atteint ta limite de signalements pour aujourd'hui.";
  }
  return null;
}

async function refreshMagasinCompteurs(magasinId: string) {
  await sql`
    update public.magasins m
    set nb_jaime = (select count(*) from public.votes_magasins where magasin_id = m.id and type = 'jaime'),
        nb_signalements = (select count(*) from public.votes_magasins where magasin_id = m.id and type = 'signalement')
    where m.id = ${magasinId}
  `;
}

async function refreshDisponibiliteCompteurs(disponibiliteId: string) {
  await sql`
    update public.disponibilites d
    set nb_confirmations = (select count(*) from public.votes_disponibilites where disponibilite_id = d.id and type = 'confirmation'),
        nb_contestations = (select count(*) from public.votes_disponibilites where disponibilite_id = d.id and type = 'contestation'),
        nb_signalements = (select count(*) from public.signalements_disponibilites where disponibilite_id = d.id)
    where d.id = ${disponibiliteId}
  `;
}

export async function likeStore(storeId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const storeRows = await sql`select cree_par from public.magasins where id = ${storeId}`;
  if ((storeRows[0] as { cree_par: string | null } | undefined)?.cree_par === user.id) {
    return { error: "Tu ne peux pas voter pour ton propre magasin." };
  }

  await sql`
    insert into public.votes_magasins (magasin_id, utilisateur_id, type, categorie)
    values (${storeId}, ${user.id}, 'jaime', null)
    on conflict (magasin_id, utilisateur_id) do update set type = 'jaime', categorie = null, cree_le = now()
  `;
  await refreshMagasinCompteurs(storeId);
  revalidatePath("/");
  return { success: true };
}

/** Signalement rapide sans raison détaillée (bouton simple, distinct de la boîte de
 *  dialogue signalerMagasin) : traité comme un signalement générique. */
export async function reportStore(storeId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  await sql`
    insert into public.votes_magasins (magasin_id, utilisateur_id, type, categorie)
    values (${storeId}, ${user.id}, 'signalement', 'inapproprie')
    on conflict (magasin_id, utilisateur_id) do update set type = 'signalement', categorie = 'inapproprie', cree_le = now()
  `;
  await refreshMagasinCompteurs(storeId);
  await resolveMagasinVote(storeId);
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
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) {
    return { error: "Choisis une raison." };
  }
  const categorie = CATEGORIE_MAGASIN[reason] ?? "inapproprie";

  const quotaError = await checkSignalementQuota(user.id);
  if (quotaError) return { error: quotaError };

  await sql`
    insert into public.votes_magasins (magasin_id, utilisateur_id, type, categorie)
    values (${storeId}, ${user.id}, 'signalement', ${categorie})
    on conflict (magasin_id, utilisateur_id) do update set type = 'signalement', categorie = ${categorie}, cree_le = now()
  `;
  await refreshMagasinCompteurs(storeId);
  await resolveMagasinVote(storeId);

  revalidatePath("/magasins");
  revalidatePath("/");
  return { success: true };
}

/** Épingler = mise en avant/accès rapide uniquement, aucune notification associée. */
export async function togglePinStore(storeId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const rows = await sql`
    delete from public.magasins_epingles where utilisateur_id = ${user.id} and magasin_id = ${storeId}
    returning magasin_id
  `.catch(() => null);

  let pinned: boolean;
  if (rows && rows.length > 0) {
    pinned = false;
  } else {
    try {
      await sql`
        insert into public.magasins_epingles (utilisateur_id, magasin_id)
        values (${user.id}, ${storeId})
        on conflict do nothing
      `;
    } catch {
      return { error: "Magasin introuvable." };
    }
    pinned = true;
  }

  revalidatePath("/magasins");
  revalidatePath("/profil");
  return { success: true as const, pinned };
}

/** Suivi = déclenche les notifications de réassort pour ce magasin, indépendant du favori. */
export async function toggleFollowStore(storeId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const deleted = await sql`
    delete from public.magasins_suivis where utilisateur_id = ${user.id} and magasin_id = ${storeId}
    returning magasin_id
  `;

  let followed: boolean;
  if (deleted.length > 0) {
    followed = false;
  } else {
    try {
      await sql`
        insert into public.magasins_suivis (utilisateur_id, magasin_id)
        values (${user.id}, ${storeId})
        on conflict do nothing
      `;
    } catch {
      return { error: "Magasin introuvable." };
    }
    followed = true;
  }

  revalidatePath("/magasins");
  revalidatePath("/notifications");
  revalidatePath("/profil");
  return { success: true as const, followed };
}

export async function toggleFollowProduct(productId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const deleted = await sql`
    delete from public.produits_suivis where utilisateur_id = ${user.id} and produit_id = ${productId}
    returning produit_id
  `;

  let followed: boolean;
  if (deleted.length > 0) {
    followed = false;
  } else {
    try {
      await sql`
        insert into public.produits_suivis (utilisateur_id, produit_id)
        values (${user.id}, ${productId})
        on conflict do nothing
      `;
    } catch {
      return { error: "Produit introuvable." };
    }
    followed = true;
  }

  revalidatePath("/magasins");
  revalidatePath("/notifications");
  revalidatePath("/profil");
  return { success: true as const, followed };
}

export interface SuivreProduitFormState {
  error?: string;
  success?: boolean;
}

async function findOrCreateProduct(
  name: string,
  series: string,
  setName: string,
  type: ProductType,
  imageUrl?: string
): Promise<string> {
  const rows = await sql`
    insert into public.produits (nom, type, serie, extension, image_url)
    values (${name}, ${type}, ${series}, ${setName}, ${imageUrl ?? null})
    on conflict (type, extension, nom) do update set
      serie = excluded.serie,
      image_url = coalesce(produits.image_url, excluded.image_url)
    returning id
  `;
  return (rows[0] as { id: string }).id;
}

/**
 * Enregistre un ou plusieurs produits (un par type coché) dans le catalogue (créés s'ils
 * n'existent pas déjà) et les suit, sans passer par un signalement de dispo, pour pouvoir
 * suivre un produit avant qu'il n'ait été vu en magasin par qui que ce soit.
 */
export async function suivreNouveauProduit(
  _prevState: SuivreProduitFormState | null,
  formData: FormData
): Promise<SuivreProduitFormState> {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const series = (formData.get("series") as string)?.trim();
  const setName = (formData.get("setName") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim();
  const types = formData.getAll("type") as string[];
  const langues = formData.getAll("langue") as string[];

  if (!series) return { error: "La série est obligatoire." };
  if (!setName) return { error: "L'extension est obligatoire." };
  if (types.length === 0) return { error: "Choisis au moins un type." };
  if (langues.length === 0) return { error: "Choisis au moins une langue." };

  for (const typeRaw of types) {
    const type = (typeRaw || "autre") as ProductType;
    const productId = await findOrCreateProduct(
      productTypeLabels[type],
      series,
      setName,
      type,
      imageUrl || undefined
    );
    await sql`
      insert into public.produits_suivis (utilisateur_id, produit_id, langue)
      values (${user.id}, ${productId}, ${langues})
      on conflict (utilisateur_id, produit_id) do update set langue = excluded.langue
    `;
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
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const natureRaw = (formData.get("nature") as string)?.trim();
  const nature = (natureRaw || undefined) as AvailabilityNature | undefined;
  const priceRaw = (formData.get("price") as string)?.trim();
  const quantityRaw = (formData.get("quantity") as string)?.trim();

  if (!nature) return { error: "La nature est obligatoire." };
  if (!quantityRaw) return { error: "La quantité est obligatoire." };
  if (!quantityOptions.includes(quantityRaw as QuantityRange)) return { error: "Quantité invalide." };
  const quantity = quantityRaw as QuantityRange;
  const isRupture = quantity === "Rupture";

  // Un produit en rupture n'a pas de prix affiché.
  let priceCents: number | undefined;
  if (!isRupture) {
    if (!priceRaw) return { error: "Le prix est obligatoire." };
    const price = Math.round(Number(priceRaw) * 100) / 100;
    if (!Number.isFinite(price) || price < 0) return { error: "Prix invalide." };
    priceCents = Math.round(price * 100);
  }

  if (availabilityId) {
    // Édition : seuls nature, prix et quantité changent, le produit
    // (type/série/extension/langue) et la photo restent ceux d'origine.
    const dispoRows = await sql`
      select signale_par from public.disponibilites where id = ${availabilityId}
    `;
    const auteurId = (dispoRows[0] as { signale_par: string | null } | undefined)?.signale_par;
    if (!auteurId) return { error: "Disponibilité introuvable." };

    // Modifier l'annonce de quelqu'un d'autre est réservé à Confirmé+ (Nouveau reste
    // trop facile à obtenir avec un compte jetable pour ouvrir ça à tout le monde), et
    // même à ce palier ça reste soumis à un quota, comme les votes/signalements.
    if (auteurId !== user.id) {
      const reputation = await getReputation(user.id);
      const tier = tierOf(reputation);
      if (tier === "nouveau") {
        return { error: "Il faut être au moins Confirmé pour modifier l'annonce de quelqu'un d'autre." };
      }
      const used = await countEditsAutresToday(user.id);
      if (used >= DAILY_LIMITS[tier].editsAutres) {
        return { error: "Tu as atteint ta limite de modifications d'annonces d'autrui pour aujourd'hui." };
      }
    }

    // Le prix/quantité/nature changent : les confirmations/contestations précédentes
    // portaient sur l'ancienne valeur, elles ne veulent plus rien dire. On repart d'un
    // statut neutre (et on reprend tout delta de réputation déjà touché pour l'ancien
    // statut) plutôt que de garder un badge "confirmée" collé à une info qui vient de
    // changer.
    await resetDisponibiliteResolution(availabilityId);
    await sql`
      update public.disponibilites
      set prix_centimes = ${priceCents ?? null}, quantite = ${quantity}, nature = ${nature},
          modifie_par = ${user.id}, modifie_le = now()
      where id = ${availabilityId}
    `;
    await resolveDisponibiliteVote(availabilityId);
  } else {
    const series = (formData.get("series") as string)?.trim();
    const setName = (formData.get("setName") as string)?.trim();
    const type = ((formData.get("type") as string) || "autre") as ProductType;
    const language = (formData.get("language") as string)?.trim();
    const photoUrl = (formData.get("photoUrl") as string)?.trim();

    if (!series) return { error: "La série est obligatoire." };
    if (!setName) return { error: "L'extension est obligatoire." };
    if (!language) return { error: "La langue est obligatoire." };
    if (!photoUrl) return { error: "Une photo est obligatoire." };

    const productId = await findOrCreateProduct(productTypeLabels[type], series, setName, type);

    const existing = await sql`
      select 1 from public.disponibilites where produit_id = ${productId} and magasin_id = ${storeId} limit 1
    `;
    if (existing.length > 0) {
      return {
        error:
          "Ce produit est déjà référencé dans ce magasin. Confirme l'annonce existante plutôt que d'en créer une nouvelle.",
      };
    }

    const reputation = await getReputation(user.id);
    await sql`
      insert into public.disponibilites
        (produit_id, magasin_id, signale_par, prix_centimes, langue, quantite, nature, photo_url, confiance_base)
      values
        (${productId}, ${storeId}, ${user.id}, ${priceCents ?? null}, ${language}, ${quantity}, ${nature}, ${photoUrl}, ${reputation})
    `;
  }

  revalidatePath("/magasins");
  return { success: true };
}

export type VoteValue = "confirm" | "dispute" | null;

/**
 * Applique `newVote` pour cet utilisateur (le paramètre `previousVote`, conservé pour
 * l'appel optimiste côté client, n'est plus utilisé côté serveur : la vraie ligne de
 * vote fait foi, pas ce que le client croit avoir voté avant).
 */
export async function voterDisponibilite(
  availabilityId: string,
  _previousVote: VoteValue,
  newVote: VoteValue
) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  if (newVote === null) {
    await sql`
      delete from public.votes_disponibilites where disponibilite_id = ${availabilityId} and utilisateur_id = ${user.id}
    `;
  } else {
    const dispoRows = await sql`select signale_par from public.disponibilites where id = ${availabilityId}`;
    if ((dispoRows[0] as { signale_par: string | null } | undefined)?.signale_par === user.id) {
      return { error: "Tu ne peux pas voter sur ta propre disponibilité." };
    }

    const quotaError = await checkVoteQuota(user.id);
    if (quotaError) return { error: quotaError };

    const type = newVote === "confirm" ? "confirmation" : "contestation";
    await sql`
      insert into public.votes_disponibilites (disponibilite_id, utilisateur_id, type)
      values (${availabilityId}, ${user.id}, ${type})
      on conflict (disponibilite_id, utilisateur_id) do update set type = ${type}, cree_le = now()
    `;
    if (newVote === "confirm") {
      await sql`update public.disponibilites set derniere_confirmation_le = now() where id = ${availabilityId}`;
    }
  }

  await refreshDisponibiliteCompteurs(availabilityId);
  await resolveDisponibiliteVote(availabilityId);

  revalidatePath("/magasins");
  return { success: true };
}

export async function togglePinDisponibilite(availabilityId: string) {
  await requireSession();

  const rows = await sql`
    update public.disponibilites set epingle = not epingle where id = ${availabilityId}
    returning epingle
  `;
  const row = rows[0] as { epingle: boolean } | undefined;
  if (!row) return { error: "Disponibilité introuvable." };

  revalidatePath("/magasins");
  return { success: true as const, pinned: row.epingle };
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
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const reason = (formData.get("reason") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim();
  if (!reason) return { error: "Choisis une raison." };
  const motif = MOTIF_DISPO[reason] ?? "autre";

  const quotaError = await checkSignalementQuota(user.id);
  if (quotaError) return { error: quotaError };

  const inserted = await sql`
    insert into public.signalements_disponibilites (disponibilite_id, utilisateur_id, motif, commentaire)
    values (${availabilityId}, ${user.id}, ${motif}, ${comment || null})
    on conflict (disponibilite_id, utilisateur_id) do nothing
    returning id
  `;
  if (inserted.length === 0) {
    return { error: "Tu as déjà signalé cette annonce." };
  }

  await refreshDisponibiliteCompteurs(availabilityId);
  await resolveDisponibiliteVote(availabilityId);

  revalidatePath("/magasins");
  return { success: true };
}
