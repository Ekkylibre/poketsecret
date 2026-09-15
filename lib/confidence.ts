// Nombre de jours sans confirmation au bout duquel une annonce est considérée
// "probablement épuisée" (voir isProbablyStale) : correspond au plancher de decayedConfidence
// ci-dessous, pour que le badge net et le pourcentage racontent la même histoire au même
// moment plutôt que deux seuils différents et arbitraires.
export const STALE_BADGE_DAYS = 7;

// Utilisés par le cron de relance (app/api/cron/relance-annonces/route.ts), pas par le
// rendu d'une carte : regroupés ici quand même, avec les autres seuils liés à l'âge d'une
// annonce, plutôt que dans lib/reputation-constants.ts qui n'a rien à voir avec cette
// notion. RELANCE_STALE_DAYS < STALE_BADGE_DAYS : le rappel doit arriver AVANT que
// l'annonce affiche déjà "Probablement épuisé", pas après.
export const RELANCE_STALE_DAYS = 5;
// Ne jamais relancer plus d'une fois par semaine sur la même annonce, même si personne
// n'a réagi à la précédente relance : sans ça, une annonce jamais reconfirmée après une
// première relance en recevrait une nouvelle à CHAQUE exécution du cron (quotidienne).
export const RELANCE_COOLDOWN_DAYS = 7;

/**
 * Une disponibilité perd de sa fiabilité avec le temps : la confiance décroît
 * linéairement jusqu'à un plancher de 20 % au bout de 7 jours. `lastConfirmedAt`, quand
 * fourni, sert de point de départ à la place de `reportedAt` : sans ça, confirmer une
 * annonce ne remettait jamais son horloge à zéro, la confiance affichée continuait de
 * décroître depuis le tout premier signalement même juste après une confirmation toute
 * fraîche.
 */
export function decayedConfidence(
  baseConfidence: number,
  reportedAt: string,
  lastConfirmedAt?: string
): number {
  const referenceDate = lastConfirmedAt ?? reportedAt;
  const ageDays = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.max(0.2, 1 - ageDays / 7);
  return Math.round(baseConfidence * decayFactor);
}

/** true si personne n'a confirmé (ou signalé pour la première fois) cette annonce depuis
 *  au moins STALE_BADGE_DAYS : le stock est probablement épuisé plutôt que juste "moins
 *  fiable au fil du temps", mérite un badge net plutôt qu'un pourcentage qui continue
 *  doucement de baisser sans jamais vraiment le dire. */
export function isProbablyStale(reportedAt: string, lastConfirmedAt?: string): boolean {
  const referenceDate = lastConfirmedAt ?? reportedAt;
  const ageDays = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= STALE_BADGE_DAYS;
}

/** Âge en heures d'une date ISO, jusqu'à maintenant. */
export function ageInHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

/** Fiabilité d'un magasin déduite du ratio likes / (likes + signalements). */
export function storeConfidence(likes: number, reports: number): number {
  const total = likes + reports;
  if (total === 0) return 100;
  return Math.round((likes / total) * 100);
}

export function confidenceLabel(confidence: number): "Fiable" | "Incertain" | "À vérifier" {
  if (confidence >= 70) return "Fiable";
  if (confidence >= 40) return "Incertain";
  return "À vérifier";
}

/** Format compact sans "il y a", pour économiser l'espace dans les listes. */
export function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} j`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export type DateBucket = "Aujourd'hui" | "Hier" | "7 derniers jours" | "Plus ancien";

/** Regroupe une date ISO en catégorie relative (jour calendaire, pas juste 24h glissantes). */
export function dateBucket(iso: string): DateBucket {
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(iso))) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays <= 7) return "7 derniers jours";
  return "Plus ancien";
}
