import webpush from "web-push";

import { sql } from "@/lib/db";

// Ne doit jamais être importé depuis un composant client : web-push utilise des API Node
// (crypto) absentes du navigateur, et VAPID_PRIVATE_KEY est un secret serveur (pas de
// préfixe NEXT_PUBLIC_). Réservé aux server actions.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  /** Page à ouvrir/focus au clic sur la notification, lue par public/sw.js. */
  url?: string;
}

/** Envoie une notification push à tous les navigateurs/appareils abonnés de cet
 *  utilisateur (un par abonnement créé). Retire silencieusement les abonnements
 *  expirés/révoqués (404/410, ex. navigateur désinstallé ou permission retirée) plutôt
 *  que de laisser la table se remplir d'entrées mortes. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subs = await sql`
    select id, endpoint, p256dh, auth from public.push_subscriptions where utilisateur_id = ${userId}
  `;

  await Promise.all(
    (subs as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await sql`delete from public.push_subscriptions where id = ${sub.id}`;
        }
      }
    })
  );
}

/**
 * Notifie les utilisateurs concernés par une toute nouvelle disponibilité (pas les
 * éditions : reprend volontairement le même filtre que getFollowedAvailabilities dans
 * lib/notifications.ts, sans le check "après la date de suivi" qui n'a de sens que pour
 * lister un historique, pas ici où il n'existe que cette dispo). Deux façons d'être
 * concerné, qu'on fusionne en une seule liste d'utilisateurs (dédupliqués) :
 * - suivre le produit (avec filtre langue éventuel) ;
 * - suivre le magasin.
 * L'auteur n'est jamais notifié de sa propre annonce.
 */
export async function notifyFollowersOfNewDisponibilite(
  dispoId: string,
  produitId: string,
  storeId: string,
  authorId: string,
  langue: string
): Promise<void> {
  const [context, produitFollowers, storeFollowers] = await Promise.all([
    sql`
      select p.nom as produit_nom, p.extension, m.nom as magasin_nom
      from public.disponibilites d
      join public.produits p on p.id = d.produit_id
      join public.magasins m on m.id = d.magasin_id
      where d.id = ${dispoId}
    `,
    sql`
      select utilisateur_id from public.produits_suivis
      where produit_id = ${produitId} and utilisateur_id != ${authorId}
        and (langue is null or ${langue} = any(langue))
    `,
    sql`
      select utilisateur_id from public.magasins_suivis
      where magasin_id = ${storeId} and utilisateur_id != ${authorId}
    `,
  ]);

  const ctx = context[0] as { produit_nom: string; extension: string; magasin_nom: string } | undefined;
  if (!ctx) return;

  const userIds = new Set<string>([
    ...(produitFollowers as { utilisateur_id: string }[]).map((r) => r.utilisateur_id),
    ...(storeFollowers as { utilisateur_id: string }[]).map((r) => r.utilisateur_id),
  ]);
  if (userIds.size === 0) return;

  const payload: PushPayload = {
    title: `${ctx.produit_nom} ${ctx.extension} disponible !`,
    body: `Repéré chez ${ctx.magasin_nom}`,
    url: `/magasins?store=${storeId}&dispo=${dispoId}`,
  };

  await Promise.all([...userIds].map((userId) => sendPushToUser(userId, payload)));
}
