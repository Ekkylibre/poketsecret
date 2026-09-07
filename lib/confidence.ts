/**
 * Une disponibilité perd de sa fiabilité avec le temps : la confiance décroît
 * linéairement jusqu'à un plancher de 20 % au bout de 7 jours.
 */
export function decayedConfidence(baseConfidence: number, reportedAt: string): number {
  const ageDays = (Date.now() - new Date(reportedAt).getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.max(0.2, 1 - ageDays / 7);
  return Math.round(baseConfidence * decayFactor);
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
