import type { AvailabilityNature, ProductType, QuantityRange } from "@/lib/types";

export const productTypeLabels: Record<ProductType, string> = {
  booster: "Booster",
  blister: "Blister",
  display: "Display",
  coffret_dresseur_elite: "Coffret Dresseur d'Élite",
  coffret_premium: "Coffret Premium",
  coffret_ultra_premium: "Coffret Ultra Premium",
  coffret: "Coffret",
  pokebox: "Pokébox",
  tin: "Tin",
  tripack: "Tripack",
  bundle: "Bundle",
  classeur: "Classeur",
  deck: "Deck",
  autre: "Autre",
};

// Langues effectivement pertinentes pour le marché suivi par l'app (les autres langues
// d'impression officielles existent mais ne concernent pas ce qui circule en boutique FR).
export const languageOptions = ["Français", "Anglais", "Japonais", "Coréen", "Chinois"];

export const quantityOptions: QuantityRange[] = ["1-5", "5-10", "10+", "Rupture"];

// Fond plein (pas de /20 translucide) : ce badge flotte sur la photo du produit, souvent
// colorée/chargée, un fond quasi transparent s'y noie et devient illisible.
export const natureStyles: Record<AvailabilityNature, string> = {
  Nouveau: "bg-sky-500 text-white shadow-sm",
  Promo: "bg-amber-500 text-white shadow-sm",
  Réassort: "bg-emerald-500 text-white shadow-sm",
};

export const languageAbbreviations: Record<string, string> = {
  Français: "FR",
  Anglais: "ENG",
  Japonais: "JAP",
  Coréen: "COR",
  Chinois: "CHN",
};

/** Accepte aussi bien des `Product[]` que le référentiel TCGdex (`SeriesExtensionPair[]`) :
 *  seuls `series`/`setName` sont lus par `distinctSeries`/`setNamesForSeries`, donc les
 *  deux sources se mélangent sans conversion. Les autres champs ne viennent que de TCGdex. */
export interface SeriesExtensionPair {
  series: string;
  setName: string;
  seriesLogoUrl?: string;
  setLogoUrl?: string;
}

export function distinctSeries(items: { series: string }[]): string[] {
  return Array.from(new Set(items.map((p) => p.series)));
}

/** Extensions disponibles pour une série donnée, vide tant qu'aucune série n'est choisie. */
export function setNamesForSeries(items: SeriesExtensionPair[], series: string): string[] {
  const trimmed = series.trim().toLowerCase();
  if (!trimmed) return [];
  return Array.from(
    new Set(items.filter((p) => p.series.trim().toLowerCase() === trimmed).map((p) => p.setName))
  );
}
