import { sql } from "@/lib/db";
import type { Availability, Product, Store } from "@/lib/types";

/** Inclut volontairement les magasins masqués, même raison que fetchAvailabilities :
 *  le vote doit rester possible pour permettre un démasquage communautaire. */
export async function fetchStores(): Promise<Store[]> {
  const rows = await sql`
    select id, nom, adresse, code_postal, ville, latitude, longitude, telephone, horaires,
      cree_par, cree_le, modifie_par, modifie_le, nb_jaime, nb_signalements, masque
    from public.magasins
    order by nom
  `;
  return (rows as Record<string, unknown>[]).map((m) => ({
    id: m.id as string,
    name: m.nom as string,
    address: m.adresse as string,
    postalCode: (m.code_postal as string | null) ?? undefined,
    city: m.ville as string,
    lat: m.latitude as number,
    lng: m.longitude as number,
    phone: (m.telephone as string | null) ?? undefined,
    hours: (m.horaires as Store["hours"] | null) ?? undefined,
    createdById: (m.cree_par as string | null) ?? "",
    createdAt: (m.cree_le as Date).toISOString(),
    lastModifiedById: (m.modifie_par as string | null) ?? undefined,
    lastModifiedAt: m.modifie_le ? (m.modifie_le as Date).toISOString() : undefined,
    likes: m.nb_jaime as number,
    reports: m.nb_signalements as number,
    flags: m.nb_signalements as number,
    masked: m.masque as boolean,
  }));
}

export async function fetchProducts(): Promise<Product[]> {
  const rows = await sql`
    select id, nom, type, serie, extension, image_url from public.produits order by nom
  `;
  return (rows as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    name: p.nom as string,
    type: p.type as Product["type"],
    series: (p.serie as string | null) ?? "",
    setName: p.extension as string,
    imageUrl: (p.image_url as string | null) ?? undefined,
  }));
}

/** Inclut volontairement les dispos masquées (pas de `where masquee = false`) : le vote
 *  doit rester possible dessus pour que la communauté puisse renverser un masquage à
 *  tort (voir resolveDisponibiliteVote), les cacher purement et simplement empêcherait
 *  quiconque de jamais les revoter. Le flux de notifications, lui, les filtre bien
 *  (voir lib/notifications.ts) : ne pas alerter sur du contenu déjà contesté. */
export async function fetchAvailabilities(): Promise<Availability[]> {
  const rows = await sql`
    select id, produit_id, magasin_id, signale_par, signale_le, derniere_confirmation_le,
      modifie_par, modifie_le, prix_centimes, langue, quantite, photo_url, nature, epingle,
      confiance_base, nb_confirmations, nb_contestations, nb_signalements, masquee
    from public.disponibilites
  `;
  return (rows as Record<string, unknown>[]).map((a) => ({
    id: a.id as string,
    productId: a.produit_id as string,
    storeId: a.magasin_id as string,
    reportedById: (a.signale_par as string | null) ?? "",
    reportedAt: (a.signale_le as Date).toISOString(),
    lastConfirmedAt: a.derniere_confirmation_le
      ? (a.derniere_confirmation_le as Date).toISOString()
      : undefined,
    lastModifiedById: (a.modifie_par as string | null) ?? undefined,
    lastModifiedAt: a.modifie_le ? (a.modifie_le as Date).toISOString() : undefined,
    price: a.prix_centimes != null ? (a.prix_centimes as number) / 100 : undefined,
    language: (a.langue as string | null) ?? undefined,
    quantity: (a.quantite as Availability["quantity"]) ?? undefined,
    photoUrl: (a.photo_url as string | null) ?? undefined,
    nature: (a.nature as Availability["nature"]) ?? undefined,
    pinned: a.epingle as boolean,
    baseConfidence: a.confiance_base as number,
    confirmations: a.nb_confirmations as number,
    disputes: a.nb_contestations as number,
    masked: a.masquee as boolean,
    flags: a.nb_signalements as number,
  }));
}

/** Remplace l'ancien lookup statique `mockUsers`/`getUsername` : les pseudos réels
 *  vivent dans profils_utilisateurs, pas dans un objet en dur. */
export async function fetchAuthorPseudos(): Promise<Record<string, string>> {
  const rows = await sql`select id, pseudo from public.profils_utilisateurs`;
  const map: Record<string, string> = {};
  for (const r of rows as { id: string; pseudo: string }[]) map[r.id] = r.pseudo;
  return map;
}

export interface FollowState {
  pinnedStoreIds: string[];
  followedStoreIds: string[];
  followedProductIds: string[];
}

export async function fetchFollowState(userId: string): Promise<FollowState> {
  const [pinned, followedStores, followedProducts] = await Promise.all([
    sql`select magasin_id from public.magasins_epingles where utilisateur_id = ${userId}`,
    sql`select magasin_id from public.magasins_suivis where utilisateur_id = ${userId}`,
    sql`select produit_id from public.produits_suivis where utilisateur_id = ${userId}`,
  ]);
  return {
    pinnedStoreIds: (pinned as { magasin_id: string }[]).map((r) => r.magasin_id),
    followedStoreIds: (followedStores as { magasin_id: string }[]).map((r) => r.magasin_id),
    followedProductIds: (followedProducts as { produit_id: string }[]).map((r) => r.produit_id),
  };
}
