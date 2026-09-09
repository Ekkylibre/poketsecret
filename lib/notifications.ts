import { sql } from "@/lib/db";
import type { Availability, Product, Store } from "@/lib/types";

export interface FollowedAvailability {
  availability: Availability;
  product: Product;
  store: Store;
  isRead: boolean;
}

export function notificationDate(availability: Availability): string {
  return availability.lastModifiedAt ?? availability.reportedAt;
}

/**
 * Dispos qui déclenchent une notification pour cet utilisateur : produit suivi, ou
 * magasin suivi avec du nouveau survenu après le suivi (sinon suivre un magasin ferait
 * remonter d'un coup tout son stock existant). Exclut les dispos masquées (modération)
 * et celles que l'utilisateur a explicitement fermées.
 */
export async function getFollowedAvailabilities(userId: string): Promise<FollowedAvailability[]> {
  const rows = await sql`
    select
      d.id, d.produit_id, d.magasin_id, d.signale_par, d.signale_le,
      d.derniere_confirmation_le, d.modifie_par, d.modifie_le,
      d.prix_centimes, d.langue, d.quantite, d.photo_url, d.nature, d.epingle,
      d.confiance_base, d.nb_confirmations, d.nb_contestations, d.nb_signalements,
      p.nom as p_nom, p.type as p_type, p.serie as p_serie, p.extension as p_extension,
      p.image_url as p_image_url,
      m.nom as m_nom, m.adresse as m_adresse, m.code_postal as m_code_postal,
      m.ville as m_ville, m.latitude as m_latitude, m.longitude as m_longitude,
      m.telephone as m_telephone, m.horaires as m_horaires, m.cree_par as m_cree_par,
      m.cree_le as m_cree_le, m.modifie_par as m_modifie_par, m.modifie_le as m_modifie_le,
      m.nb_jaime as m_nb_jaime, m.nb_signalements as m_nb_signalements,
      coalesce(ne.lue, false) as is_read
    from public.disponibilites d
    join public.produits p on p.id = d.produit_id
    join public.magasins m on m.id = d.magasin_id
    left join public.produits_suivis ps on ps.produit_id = d.produit_id and ps.utilisateur_id = ${userId}
    left join public.magasins_suivis ms on ms.magasin_id = d.magasin_id and ms.utilisateur_id = ${userId}
    left join public.notifications_etat ne on ne.disponibilite_id = d.id and ne.utilisateur_id = ${userId}
    where d.masquee = false
      and coalesce(ne.masquee, false) = false
      and (
        (ps.produit_id is not null and (ps.langue is null or d.langue = any(ps.langue)))
        or (ms.magasin_id is not null and coalesce(d.modifie_le, d.signale_le) > ms.cree_le)
      )
    order by coalesce(d.modifie_le, d.signale_le) desc
  `;

  return (rows as Record<string, unknown>[]).map((r) => {
    const availability: Availability = {
      id: r.id as string,
      productId: r.produit_id as string,
      storeId: r.magasin_id as string,
      reportedById: (r.signale_par as string | null) ?? "",
      reportedAt: (r.signale_le as Date).toISOString(),
      lastConfirmedAt: r.derniere_confirmation_le
        ? (r.derniere_confirmation_le as Date).toISOString()
        : undefined,
      lastModifiedById: (r.modifie_par as string | null) ?? undefined,
      lastModifiedAt: r.modifie_le ? (r.modifie_le as Date).toISOString() : undefined,
      price: r.prix_centimes != null ? (r.prix_centimes as number) / 100 : undefined,
      language: (r.langue as string | null) ?? undefined,
      quantity: (r.quantite as Availability["quantity"]) ?? undefined,
      photoUrl: (r.photo_url as string | null) ?? undefined,
      nature: (r.nature as Availability["nature"]) ?? undefined,
      pinned: r.epingle as boolean,
      baseConfidence: r.confiance_base as number,
      confirmations: r.nb_confirmations as number,
      disputes: r.nb_contestations as number,
      flags: r.nb_signalements as number,
    };
    const product: Product = {
      id: r.produit_id as string,
      name: r.p_nom as string,
      type: r.p_type as Product["type"],
      series: (r.p_serie as string | null) ?? "",
      setName: r.p_extension as string,
      imageUrl: (r.p_image_url as string | null) ?? undefined,
    };
    const store: Store = {
      id: r.magasin_id as string,
      name: r.m_nom as string,
      address: r.m_adresse as string,
      postalCode: (r.m_code_postal as string | null) ?? undefined,
      city: r.m_ville as string,
      lat: r.m_latitude as number,
      lng: r.m_longitude as number,
      phone: (r.m_telephone as string | null) ?? undefined,
      hours: (r.m_horaires as Store["hours"] | null) ?? undefined,
      createdById: (r.m_cree_par as string | null) ?? "",
      createdAt: (r.m_cree_le as Date).toISOString(),
      lastModifiedById: (r.m_modifie_par as string | null) ?? undefined,
      lastModifiedAt: r.m_modifie_le ? (r.m_modifie_le as Date).toISOString() : undefined,
      likes: r.m_nb_jaime as number,
      reports: r.m_nb_signalements as number,
      flags: r.m_nb_signalements as number,
    };
    return { availability, product, store, isRead: r.is_read as boolean };
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const all = await getFollowedAvailabilities(userId);
  return all.filter((a) => !a.isRead).length;
}
