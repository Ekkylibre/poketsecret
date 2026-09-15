import { isAdminUser } from "@/lib/admin";
import { sql } from "@/lib/db";
import {
  FENETRE_ANTI_COLLUSION_JOURS,
  RECONFIRMATION_DELTA,
  RECONFIRMATION_STALE_DAYS,
  REPUTATION_DELTA,
  REPUTATION_MAX,
  REPUTATION_MIN,
  SEUIL_DEMASQUAGE,
  THRESHOLDS,
} from "@/lib/reputation-constants";

// Les constantes pures (paliers, seuils, quotas) et le type Tier vivent dans
// reputation-constants.ts, importable depuis un composant client. Ce fichier-ci ne
// contient que ce qui touche la base (lib/db), donc jamais safe à importer côté client.
export * from "@/lib/reputation-constants";

/**
 * Ferme une race condition trouvée lors d'un audit de sécurité : sans verrou, plusieurs
 * requêtes concurrentes d'un même utilisateur peuvent chacune lire le compteur du jour
 * AVANT qu'aucune n'ait écrit, et donc toutes passer un quota censé n'autoriser qu'UNE
 * écriture (reproduit en conditions réelles : 2 signalements passés sur une limite de 1
 * en envoyant 4 requêtes en parallèle). `pg_advisory_xact_lock` (portée transaction, pas
 * besoin de le relâcher explicitement) sérialise les tentatives d'un même
 * (utilisateur, clé de quota) : la suivante ne peut lire le compte qu'une fois la
 * précédente réellement commitée.
 *
 * `insertQuery` doit revérifier le quota dans sa PROPRE clause WHERE (ex. `where (select
 * count(*) ...) < limite`) : c'est la requête protégée par le verrou qui doit trancher,
 * pas un contrôle fait par du code séparé avant l'appel (ce contrôle-là reste utile
 * comme filtre rapide/message clair, mais jamais comme seule protection).
 */
export async function withQuotaLock<T = Record<string, unknown>>(
  userId: string,
  quotaKey: string,
  insertQuery: ReturnType<typeof sql>
): Promise<T[]> {
  const results = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${userId} || ':' || ${quotaKey}))`,
    insertQuery,
  ]);
  return results[1] as T[];
}

/** Applique un ajustement de réputation et journalise pourquoi, dans une seule
 *  transaction avec la mise à jour de statut qui l'a déclenché (voir appelants). */
async function applyReputationDelta(
  utilisateurId: string,
  delta: number,
  raison: string,
  cibleType: "disponibilite" | "magasin",
  cibleId: string
) {
  if (delta === 0) return [];
  return [
    sql`
      update public.profils_utilisateurs
      set reputation = greatest(${REPUTATION_MIN}, least(${REPUTATION_MAX}, reputation + ${delta})),
          modifie_le = now()
      where id = ${utilisateurId}
    `,
    sql`
      insert into public.evenements_reputation (utilisateur_id, delta, raison, cible_type, cible_id)
      values (${utilisateurId}, ${delta}, ${raison}, ${cibleType}, ${cibleId})
    `,
  ];
}

/**
 * Lit la référence d'ancienneté d'une annonce (dernière confirmation, ou à défaut premier
 * signalement) : à appeler AVANT d'insérer un vote de confirmation, jamais après. Un
 * trigger Postgres (synchroniser_compteurs_disponibilite, voir migration) met à jour
 * derniere_confirmation_le dès l'insertion d'un vote 'confirmation' — la lire après coup
 * verrait donc déjà la valeur fraîche que ce vote vient de poser, jamais l'ancienne.
 */
export async function readDerniereConfirmationReference(
  disponibiliteId: string
): Promise<Date | undefined> {
  const rows = await sql`
    select coalesce(derniere_confirmation_le, signale_le) as reference
    from public.disponibilites
    where id = ${disponibiliteId}
  `;
  return (rows[0] as { reference: Date } | undefined)?.reference;
}

/**
 * Si `referenceAvantVote` (voir readDerniereConfirmationReference, capturée AVANT
 * l'insertion du vote) date d'au moins RECONFIRMATION_STALE_DAYS, récompense la personne
 * qui vient de voter confirm (pas l'auteur, déjà récompensé séparément par
 * resolveDisponibiliteVote quand le score global franchit un seuil) : un petit geste pour
 * "j'ai vérifié, toujours là", pour inciter à l'entretien du stock existant, pas
 * seulement à la création de nouvelles annonces. Écriture hors verrou dédié : l'enjeu
 * (+1 point, borné par le quota de votes/jour et par l'unicité d'un vote par personne et
 * par annonce) ne le justifie pas, même tolérance que resolveDisponibiliteVote plus bas.
 */
export async function rewardReconfirmationIfStale(
  disponibiliteId: string,
  voterId: string,
  referenceAvantVote: Date | undefined
): Promise<void> {
  if (!referenceAvantVote) return;

  const ageDays = (Date.now() - referenceAvantVote.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < RECONFIRMATION_STALE_DAYS) return;

  await sql.transaction(
    await applyReputationDelta(
      voterId,
      RECONFIRMATION_DELTA,
      "reconfirmation-perimee",
      "disponibilite",
      disponibiliteId
    )
  );
}

/**
 * Recalcule l'état d'une dispo (confirmée/invalidée + masquage) après un vote
 * confirm/dispute ou un signalement, et ajuste la réputation de son auteur si l'état
 * change. Le score pondéré est lu hors transaction (une lecture obsolète de quelques
 * millisecondes n'est pas grave à cette échelle), mais le changement d'état + la
 * réputation + l'audit sont écrits ensemble, atomiquement.
 */
export async function resolveDisponibiliteVote(disponibiliteId: string) {
  const rows = await sql`
    with dispo_cible as (
      select id, resolution, masquee, signale_par as auteur_id
      from public.disponibilites
      where id = ${disponibiliteId}
    ),
    -- Ne garde, par votant, que son vote le plus ancien parmi TOUTES les dispos de cet
    -- auteur sur la fenêtre anti-collusion : si son premier vote pour cet auteur était
    -- sur une autre dispo, celui posé ici ne compte pas dans le score (mais reste
    -- affiché normalement sur la dispo elle-même, nb_confirmations/contestations n'est
    -- pas affecté par ce filtre).
    votes_pertinents as (
      select
        v.disponibilite_id, v.type, greatest(0.1, p.reputation / 100.0) as poids,
        row_number() over (partition by v.utilisateur_id order by v.cree_le asc) as rang
      from public.votes_disponibilites v
      join public.disponibilites d on d.id = v.disponibilite_id
      join public.profils_utilisateurs p on p.id = v.utilisateur_id
      cross join dispo_cible dc
      where d.signale_par = dc.auteur_id
        and v.cree_le >= now() - (${FENETRE_ANTI_COLLUSION_JOURS} || ' days')::interval
    )
    select
      dc.resolution,
      dc.masquee,
      dc.auteur_id,
      coalesce(sum(case when vp.type = 'confirmation' then vp.poids else 0 end), 0)
        - coalesce(sum(case when vp.type = 'contestation' then vp.poids else 0 end), 0)
        as score_dispute,
      count(*) filter (where vp.type in ('confirmation', 'contestation')) as votants_dispute
    from dispo_cible dc
    left join votes_pertinents vp on vp.disponibilite_id = dc.id and vp.rang = 1
    group by dc.resolution, dc.masquee, dc.auteur_id
  `;
  const row = rows[0] as
    | {
        resolution: "confirmee" | "invalidee" | null;
        masquee: boolean;
        auteur_id: string | null;
        score_dispute: number;
        votants_dispute: number;
      }
    | undefined;
  if (!row) return;

  const signalements = await computeSignalementDispoScore(disponibiliteId);

  let nouvelleResolution = row.resolution;
  if (row.votants_dispute >= THRESHOLDS.dispute.minVotants) {
    if (row.score_dispute <= THRESHOLDS.dispute.seuilMasquage) nouvelleResolution = "invalidee";
    else if (row.score_dispute >= THRESHOLDS.dispute.seuilConfirmation) nouvelleResolution = "confirmee";
    else if (row.resolution && row.score_dispute >= SEUIL_DEMASQUAGE) nouvelleResolution = null;
  }

  const disputeMasque = nouvelleResolution === "invalidee";
  const nouvelleMasquee = disputeMasque || signalements.masque;

  const statements = [];
  if (nouvelleResolution !== row.resolution || nouvelleMasquee !== row.masquee) {
    statements.push(
      sql`
        update public.disponibilites
        set resolution = ${nouvelleResolution}, masquee = ${nouvelleMasquee}, modifie_le = now()
        where id = ${disponibiliteId}
      `
    );
  }

  if (nouvelleResolution !== row.resolution && row.auteur_id) {
    const ancienDelta = row.resolution ? REPUTATION_DELTA[row.resolution] : 0;
    const nouveauDelta = nouvelleResolution ? REPUTATION_DELTA[nouvelleResolution] : 0;
    statements.push(
      ...(await applyReputationDelta(
        row.auteur_id,
        nouveauDelta - ancienDelta,
        `dispo:${nouvelleResolution ?? "neutre"}`,
        "disponibilite",
        disponibiliteId
      ))
    );
  }

  if (statements.length > 0) await sql.transaction(statements);
}

/**
 * À appeler quand le prix/la quantité/la nature d'une dispo changent (édition) : les
 * confirmations/contestations précédentes portaient sur l'ancienne valeur, elles ne
 * veulent plus rien dire. Reprend au passage tout delta de réputation déjà appliqué à
 * l'auteur pour l'ancienne résolution (sinon il garderait un +1/-2 dont plus rien ne
 * garde trace), avant de repartir d'un statut neutre.
 */
export async function resetDisponibiliteResolution(disponibiliteId: string) {
  const rows = await sql`
    select resolution, signale_par as auteur_id
    from public.disponibilites
    where id = ${disponibiliteId}
  `;
  const row = rows[0] as
    | { resolution: "confirmee" | "invalidee" | null; auteur_id: string | null }
    | undefined;
  if (!row) return;

  const statements = [
    sql`delete from public.votes_disponibilites where disponibilite_id = ${disponibiliteId}`,
    sql`
      update public.disponibilites
      set resolution = null, nb_confirmations = 0, nb_contestations = 0
      where id = ${disponibiliteId}
    `,
  ];

  if (row.resolution && row.auteur_id) {
    statements.push(
      ...(await applyReputationDelta(
        row.auteur_id,
        -REPUTATION_DELTA[row.resolution],
        "dispo:edit-reset",
        "disponibilite",
        disponibiliteId
      ))
    );
  }

  await sql.transaction(statements);
}

// Même anti-collusion que resolveDisponibiliteVote, appliquée séparément aux
// signalements (axe "contenu problématique") : un votant ne pèse que sur UN
// signalement d'un même auteur par fenêtre glissante, peu importe le motif ou la dispo
// visée, sinon les mêmes 2-3 comptes pourraient faire masquer toutes les annonces de
// quelqu'un en rafale.
async function computeSignalementDispoScore(disponibiliteId: string): Promise<{ masque: boolean }> {
  const rows = await sql`
    with dispo_cible as (
      select id, signale_par as auteur_id from public.disponibilites where id = ${disponibiliteId}
    ),
    signalements_pertinents as (
      select
        s.disponibilite_id, s.motif, greatest(0.1, p.reputation / 100.0) as poids,
        row_number() over (partition by s.utilisateur_id order by s.cree_le asc) as rang
      from public.signalements_disponibilites s
      join public.disponibilites d on d.id = s.disponibilite_id
      join public.profils_utilisateurs p on p.id = s.utilisateur_id
      cross join dispo_cible dc
      where d.signale_par = dc.auteur_id
        and s.cree_le >= now() - (${FENETRE_ANTI_COLLUSION_JOURS} || ' days')::interval
    )
    select motif, coalesce(sum(poids), 0) as score, count(*) as votants
    from signalements_pertinents
    where disponibilite_id = ${disponibiliteId} and rang = 1
    group by motif
  `;
  for (const r of rows as { motif: string; score: number; votants: number }[]) {
    const seuil =
      r.motif === "inapproprie" ? THRESHOLDS.signalementDispoSpam : THRESHOLDS.signalementDispoGeneral;
    if (r.votants >= seuil.minVotants && r.score >= seuil.seuilMasquage) return { masque: true };
  }
  return { masque: false };
}

/** Même principe que resolveDisponibiliteVote, mais un magasin n'a que jaime/signalement
 *  (pas de confirm/dispute) et n'est jamais que masqué, jamais "confirmé" activement.
 *  Même anti-collusion : un votant ne pèse que sur un signalement d'un même créateur de
 *  magasin par fenêtre glissante, peu importe combien de ses magasins il signale. */
export async function resolveMagasinVote(magasinId: string) {
  const rows = await sql`
    select cree_par as auteur_id, masque
    from public.magasins
    where id = ${magasinId}
  `;
  const magasin = rows[0] as { auteur_id: string | null; masque: boolean } | undefined;
  if (!magasin) return;

  const scoreRows = await sql`
    with magasin_cible as (
      select id, cree_par as auteur_id from public.magasins where id = ${magasinId}
    ),
    votes_pertinents as (
      select
        v.magasin_id, greatest(0.1, p.reputation / 100.0) as poids,
        row_number() over (partition by v.utilisateur_id order by v.cree_le asc) as rang
      from public.votes_magasins v
      join public.magasins m on m.id = v.magasin_id
      join public.profils_utilisateurs p on p.id = v.utilisateur_id
      cross join magasin_cible mc
      where v.type = 'signalement' and m.cree_par = mc.auteur_id
        and v.cree_le >= now() - (${FENETRE_ANTI_COLLUSION_JOURS} || ' days')::interval
    )
    select coalesce(sum(poids), 0) as score, count(*) as votants
    from votes_pertinents
    where magasin_id = ${magasinId} and rang = 1
  `;
  const { score, votants } = scoreRows[0] as { score: number; votants: number };
  const seuil = THRESHOLDS.signalementMagasin;

  // Pas de branche de démasquage séparée : recalculé entièrement depuis les lignes
  // actuelles à chaque appel (contrairement à "dispute", il n'y a pas de contre-vote
  // positif dont l'absence justifierait un seuil à part pour repasser en dessous).
  const nouveauMasque = votants >= seuil.minVotants && score >= seuil.seuilMasquage;

  if (nouveauMasque !== magasin.masque) {
    await sql`update public.magasins set masque = ${nouveauMasque}, modifie_le = now() where id = ${magasinId}`;
  }
}

/** Même principe que resolveMagasinVote, mais la cible est un compte (pas de contenu à
 *  masquer) : pseudo_signale remplace le pseudo affiché par un texte neutre partout où
 *  il est montré (voir fetchAuthorPseudos), sans effacer le compte ni son historique.
 *  Pas de fenêtre anti-collusion : la contrainte unique(utilisateur_id, signale_par) sur
 *  signalements_pseudos garantit déjà qu'un même votant ne compte qu'une fois pour une
 *  même cible (contrairement aux votes sur dispos/magasins, où un même votant pourrait
 *  sinon peser sur plusieurs contenus différents du même auteur). */
export async function resolvePseudoSignalement(utilisateurId: string) {
  // Défense en profondeur : signalerPseudo bloque déjà l'admin en amont, mais si une
  // ligne existait quand même (accès direct à la base, futur appel qui oublie ce check),
  // le pseudo affiché ne doit jamais devenir "Utilisateur signalé" pour ce compte.
  if (isAdminUser(utilisateurId)) return;

  const rows = await sql`
    select pseudo_signale from public.profils_utilisateurs where id = ${utilisateurId}
  `;
  const profil = rows[0] as { pseudo_signale: boolean } | undefined;
  if (!profil) return;

  const scoreRows = await sql`
    select coalesce(sum(greatest(0.1, rep.reputation / 100.0)), 0) as score, count(*) as votants
    from public.signalements_pseudos s
    join public.profils_utilisateurs rep on rep.id = s.signale_par
    where s.utilisateur_id = ${utilisateurId}
  `;
  const { score, votants } = scoreRows[0] as { score: number; votants: number };
  const seuil = THRESHOLDS.signalementPseudo;

  const nouveauSignale = votants >= seuil.minVotants && score >= seuil.seuilMasquage;

  if (nouveauSignale !== profil.pseudo_signale) {
    await sql`
      update public.profils_utilisateurs set pseudo_signale = ${nouveauSignale}, modifie_le = now()
      where id = ${utilisateurId}
    `;
  }
}

/** Nombre de votes/signalements/magasins déjà posés aujourd'hui (votes) ou cette
 *  semaine (magasins) par un utilisateur, source unique de vérité pour les paliers,
 *  pas de compteur séparé à garder synchronisé. */
// "j'aime" un magasin est vote-like (adhésion positive) : compté avec les
// confirm/dispute sur les votes. "signalement" (dispo, magasin, pseudo) est un seul et
// même axe "je signale un problème" ailleurs, votes_magasins ne doit donc en compter
// qu'un type ici, l'autre dans countSignalementsToday (bug trouvé lors d'un audit de
// sécurité : signalerMagasin vérifiait le quota signalements avant d'insérer une ligne
// qui ne comptait en réalité que dans CE compteur-ci, jamais dans l'autre).
export async function countVotesToday(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select
      (select count(*) from public.votes_disponibilites where utilisateur_id = ${utilisateurId} and cree_le::date = current_date)
      + (select count(*) from public.votes_magasins where utilisateur_id = ${utilisateurId} and type = 'jaime' and cree_le::date = current_date)
      as total
  `;
  return Number((rows[0] as { total: number }).total);
}

export async function countSignalementsToday(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select
      (select count(*) from public.signalements_disponibilites where utilisateur_id = ${utilisateurId} and cree_le::date = current_date)
      + (select count(*) from public.signalements_pseudos where signale_par = ${utilisateurId} and cree_le::date = current_date)
      + (select count(*) from public.votes_magasins where utilisateur_id = ${utilisateurId} and type = 'signalement' and cree_le::date = current_date)
      as total
  `;
  return Number((rows[0] as { total: number }).total);
}

/** Modifications de dispos appartenant à *quelqu'un d'autre* faites aujourd'hui (les
 *  modifications de ses propres annonces ne sont pas comptées, pas un vecteur d'abus). */
export async function countEditsAutresToday(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as total
    from public.disponibilites
    where modifie_par = ${utilisateurId}
      and signale_par != ${utilisateurId}
      and modifie_le::date = current_date
  `;
  return Number((rows[0] as { total: number }).total);
}

/** Nouvelles annonces (première dispo d'un produit dans un magasin, pas les
 *  modifications) créées aujourd'hui par cet utilisateur. */
export async function countNouvellesAnnoncesToday(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as total
    from public.disponibilites
    where signale_par = ${utilisateurId} and signale_le::date = current_date
  `;
  return Number((rows[0] as { total: number }).total);
}

/** Même principe que countEditsAutresToday, mais pour les modifications de magasins
 *  appartenant à quelqu'un d'autre (voir modifierMagasin). */
export async function countEditsMagasinAutresToday(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as total
    from public.magasins
    where modifie_par = ${utilisateurId}
      and cree_par != ${utilisateurId}
      and modifie_le::date = current_date
  `;
  return Number((rows[0] as { total: number }).total);
}

export async function countMagasinsCetteSemaine(utilisateurId: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as total
    from public.magasins
    where cree_par = ${utilisateurId} and cree_le >= now() - interval '7 days'
  `;
  return Number((rows[0] as { total: number }).total);
}
