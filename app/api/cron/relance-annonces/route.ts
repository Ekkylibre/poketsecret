import { sql } from "@/lib/db";
import { RELANCE_COOLDOWN_DAYS, RELANCE_STALE_DAYS } from "@/lib/confidence";
import { notifyFollowersOfStaleDisponibilite } from "@/lib/push";

/**
 * Tâche planifiée (voir vercel.json) : relance les abonnés d'une annonce jamais
 * reconfirmée depuis RELANCE_STALE_DAYS, au plus une fois par RELANCE_COOLDOWN_DAYS pour
 * ne pas spammer la même annonce à chaque exécution. Exclut les annonces déjà masquées,
 * invalidées ou marquées "Rupture" (autant dire déjà réglées, pas la peine de demander
 * si c'est "toujours dispo").
 *
 * Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` quand cette
 * variable d'environnement est configurée sur le projet : c'est ce qui empêche n'importe
 * qui d'appeler cette route publique pour déclencher une vague de notifications à volonté.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const staleRows = await sql`
    update public.disponibilites
    set derniere_relance_le = now()
    where masquee = false
      and coalesce(resolution, '') != 'invalidee'
      and coalesce(quantite, '') != 'Rupture'
      and signale_par is not null
      and coalesce(derniere_confirmation_le, signale_le) < now() - (${RELANCE_STALE_DAYS} || ' days')::interval
      and (derniere_relance_le is null or derniere_relance_le < now() - (${RELANCE_COOLDOWN_DAYS} || ' days')::interval)
    returning id, produit_id, magasin_id, signale_par, coalesce(langue, 'Français') as langue
  `;

  const stale = staleRows as {
    id: string;
    produit_id: string;
    magasin_id: string;
    signale_par: string;
    langue: string;
  }[];

  await Promise.all(
    stale.map((d) =>
      notifyFollowersOfStaleDisponibilite(d.id, d.produit_id, d.magasin_id, d.signale_par, d.langue)
    )
  );

  return Response.json({ relances: stale.length });
}
