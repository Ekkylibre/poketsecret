import { describe, expect, it } from "vitest";

import { ageInHours, confidenceLabel, dateBucket, decayedConfidence, relativeTime, storeConfidence } from "./confidence";

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("decayedConfidence", () => {
  it("ne décroît pas juste après le signalement", () => {
    expect(decayedConfidence(100, isoMinutesAgo(0))).toBe(100);
  });

  it("atteint le plancher de 20 % au bout de 7 jours", () => {
    expect(decayedConfidence(100, isoDaysAgo(7))).toBe(20);
  });

  it("ne descend jamais sous le plancher de 20 %, même bien après 7 jours", () => {
    expect(decayedConfidence(100, isoDaysAgo(30))).toBe(20);
  });

  it("décroît linéairement à mi-parcours (3.5 jours = moitié du chemin vers 7 jours)", () => {
    expect(decayedConfidence(100, isoDaysAgo(3.5))).toBe(50);
  });
});

describe("ageInHours", () => {
  it("retourne environ 2h pour une date vieille de 2h", () => {
    expect(ageInHours(isoMinutesAgo(120))).toBeCloseTo(2, 1);
  });
});

describe("storeConfidence", () => {
  it("retourne 100 par défaut sans aucun vote", () => {
    expect(storeConfidence(0, 0)).toBe(100);
  });

  it("calcule le ratio likes / (likes + signalements)", () => {
    expect(storeConfidence(8, 2)).toBe(80);
  });

  it("retourne 0 si uniquement des signalements", () => {
    expect(storeConfidence(0, 5)).toBe(0);
  });
});

describe("confidenceLabel", () => {
  it("classe 70 et plus comme Fiable", () => {
    expect(confidenceLabel(70)).toBe("Fiable");
    expect(confidenceLabel(100)).toBe("Fiable");
  });

  it("classe entre 40 et 69 comme Incertain", () => {
    expect(confidenceLabel(69)).toBe("Incertain");
    expect(confidenceLabel(40)).toBe("Incertain");
  });

  it("classe en dessous de 40 comme À vérifier", () => {
    expect(confidenceLabel(39)).toBe("À vérifier");
    expect(confidenceLabel(0)).toBe("À vérifier");
  });
});

describe("relativeTime", () => {
  it("affiche 'à l'instant' pour moins d'une minute", () => {
    expect(relativeTime(isoMinutesAgo(0))).toBe("à l'instant");
  });

  it("affiche les minutes en dessous d'une heure", () => {
    expect(relativeTime(isoMinutesAgo(30))).toBe("30 min");
  });

  it("affiche les heures en dessous d'un jour", () => {
    expect(relativeTime(isoMinutesAgo(180))).toBe("3 h");
  });

  it("affiche les jours au-delà", () => {
    expect(relativeTime(isoDaysAgo(2))).toBe("2 j");
  });
});

describe("dateBucket", () => {
  it("classe aujourd'hui même signalé il y a quelques minutes", () => {
    expect(dateBucket(isoMinutesAgo(5))).toBe("Aujourd'hui");
  });

  it("classe hier comme 'Hier'", () => {
    expect(dateBucket(isoDaysAgo(1))).toBe("Hier");
  });

  it("classe entre 2 et 7 jours comme '7 derniers jours'", () => {
    expect(dateBucket(isoDaysAgo(5))).toBe("7 derniers jours");
  });

  it("classe au-delà de 7 jours comme 'Plus ancien'", () => {
    expect(dateBucket(isoDaysAgo(10))).toBe("Plus ancien");
  });
});
