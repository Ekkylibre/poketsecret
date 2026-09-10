import { describe, expect, it } from "vitest";

import {
  DAILY_LIMITS,
  MAGASIN_PAR_SEMAINE,
  TIER_THRESHOLD_CONFIRME,
  TIER_THRESHOLD_FIABLE,
  tierOf,
  voteWeight,
} from "./reputation-constants";

describe("tierOf", () => {
  it("classe en dessous du seuil Confirmé comme 'nouveau'", () => {
    expect(tierOf(0)).toBe("nouveau");
    expect(tierOf(TIER_THRESHOLD_CONFIRME - 1)).toBe("nouveau");
  });

  it("classe entre les deux seuils comme 'confirme'", () => {
    expect(tierOf(TIER_THRESHOLD_CONFIRME)).toBe("confirme");
    expect(tierOf(TIER_THRESHOLD_FIABLE - 1)).toBe("confirme");
  });

  it("classe au-dessus du seuil Fiable comme 'fiable'", () => {
    expect(tierOf(TIER_THRESHOLD_FIABLE)).toBe("fiable");
    expect(tierOf(100)).toBe("fiable");
  });
});

describe("voteWeight", () => {
  it("normalise la réputation sur une échelle 0-1", () => {
    expect(voteWeight(50)).toBe(0.5);
    expect(voteWeight(100)).toBe(1);
  });

  it("plafonne au plancher de 0.1 même pour une réputation très basse", () => {
    expect(voteWeight(0)).toBe(0.1);
    expect(voteWeight(5)).toBe(0.1);
  });
});

describe("progression des paliers (garde-fou anti-régression)", () => {
  it("chaque quota augmente strictement d'un palier au suivant", () => {
    const tiers = ["nouveau", "confirme", "fiable"] as const;
    for (const key of ["votes", "signalements", "editsAutres", "nouvellesAnnonces"] as const) {
      for (let i = 1; i < tiers.length; i++) {
        expect(DAILY_LIMITS[tiers[i]][key]).toBeGreaterThanOrEqual(DAILY_LIMITS[tiers[i - 1]][key]);
      }
    }
  });

  it("le nombre de magasins par semaine augmente aussi avec le palier", () => {
    expect(MAGASIN_PAR_SEMAINE.confirme).toBeGreaterThan(MAGASIN_PAR_SEMAINE.nouveau);
    expect(MAGASIN_PAR_SEMAINE.fiable).toBeGreaterThan(MAGASIN_PAR_SEMAINE.confirme);
  });
});
