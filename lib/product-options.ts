import type { AvailabilityNature, Product, ProductType, QuantityRange } from "@/lib/types";

export const productTypeLabels: Record<ProductType, string> = {
  booster: "Booster",
  coffret: "Coffret",
  display: "Display",
  autre: "Autre",
};

export const languageOptions = ["Français", "Anglais", "Japonais", "Coréen", "Chinois", "Autre"];

export const quantityOptions: QuantityRange[] = ["1-5", "5-10", "10+", "Rupture"];

export const natureStyles: Record<AvailabilityNature, string> = {
  Nouveau: "bg-sky-500/20 text-sky-300",
  Promo: "bg-amber-500/20 text-amber-300",
  Réassort: "bg-emerald-500/20 text-emerald-300",
};

export const languageAbbreviations: Record<string, string> = {
  Français: "FR",
  Anglais: "ENG",
  Japonais: "JAP",
  Coréen: "COR",
  Chinois: "CHN",
};

export function distinctSeries(products: Product[]): string[] {
  return Array.from(new Set(products.map((p) => p.series)));
}

/** Extensions disponibles pour une série donnée — vide tant qu'aucune série n'est choisie. */
export function setNamesForSeries(products: Product[], series: string): string[] {
  const trimmed = series.trim().toLowerCase();
  if (!trimmed) return [];
  return Array.from(
    new Set(products.filter((p) => p.series.trim().toLowerCase() === trimmed).map((p) => p.setName))
  );
}
