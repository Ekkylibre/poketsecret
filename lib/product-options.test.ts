import { describe, expect, it } from "vitest";

import { distinctSeries, setNamesForSeries } from "./product-options";

describe("distinctSeries", () => {
  it("dédoublonne les séries en préservant l'ordre de première apparition", () => {
    const items = [
      { series: "Écarlate et Violet" },
      { series: "Épée et Bouclier" },
      { series: "Écarlate et Violet" },
    ];
    expect(distinctSeries(items)).toEqual(["Écarlate et Violet", "Épée et Bouclier"]);
  });

  it("retourne un tableau vide pour une liste vide", () => {
    expect(distinctSeries([])).toEqual([]);
  });
});

describe("setNamesForSeries", () => {
  const items = [
    { series: "Écarlate et Violet", setName: "151" },
    { series: "Écarlate et Violet", setName: "Évolutions Prismatiques" },
    { series: "Épée et Bouclier", setName: "Ténèbres Embrasées" },
  ];

  it("retourne les extensions de la série demandée", () => {
    expect(setNamesForSeries(items, "Écarlate et Violet")).toEqual(["151", "Évolutions Prismatiques"]);
  });

  it("ignore la casse et les espaces superflus", () => {
    expect(setNamesForSeries(items, "  écarlate et violet  ")).toEqual(["151", "Évolutions Prismatiques"]);
  });

  it("retourne un tableau vide tant qu'aucune série n'est choisie", () => {
    expect(setNamesForSeries(items, "")).toEqual([]);
    expect(setNamesForSeries(items, "   ")).toEqual([]);
  });

  it("retourne un tableau vide pour une série inconnue", () => {
    expect(setNamesForSeries(items, "Soleil et Lune")).toEqual([]);
  });
});
