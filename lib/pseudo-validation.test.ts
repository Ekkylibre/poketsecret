import { describe, expect, it } from "vitest";

import { PSEUDO_MAX_LENGTH, validatePseudo } from "./pseudo-validation";

describe("validatePseudo", () => {
  it("accepte un pseudo normal", () => {
    expect(validatePseudo("Dresseur92")).toBeNull();
  });

  it("accepte les accents, chiffres, espaces, tirets et underscores", () => {
    expect(validatePseudo("Éléa")).toBeNull();
    expect(validatePseudo("Jean-Pierre")).toBeNull();
    expect(validatePseudo("Ash_Ketchum")).toBeNull();
    expect(validatePseudo("Sacha 92")).toBeNull();
  });

  it("rejette un pseudo trop court", () => {
    expect(validatePseudo("ab")).not.toBeNull();
  });

  it("accepte la longueur minimale exacte (3)", () => {
    expect(validatePseudo("abc")).toBeNull();
  });

  it(`rejette un pseudo de plus de ${PSEUDO_MAX_LENGTH} caractères`, () => {
    expect(validatePseudo("a".repeat(PSEUDO_MAX_LENGTH + 1))).not.toBeNull();
  });

  it("accepte la longueur maximale exacte", () => {
    expect(validatePseudo("a".repeat(PSEUDO_MAX_LENGTH))).toBeNull();
  });

  it("trim les espaces avant de vérifier la longueur", () => {
    expect(validatePseudo("  ab  ")).not.toBeNull(); // "ab" trimé = 2, trop court
    expect(validatePseudo("  abc  ")).toBeNull();
  });

  it("rejette les caractères spéciaux hors charset autorisé", () => {
    expect(validatePseudo("c0nn@rd")).not.toBeNull(); // via le charset, pas la grossièreté
    expect(validatePseudo("test!")).not.toBeNull();
    expect(validatePseudo("test.com")).not.toBeNull();
    expect(validatePseudo("<script>")).not.toBeNull();
  });

  describe("usurpation (noms réservés)", () => {
    it("rejette les variantes du compte officiel/staff", () => {
      expect(validatePseudo("Admin")).not.toBeNull();
      expect(validatePseudo("administrateur")).not.toBeNull();
      expect(validatePseudo("Modérateur")).not.toBeNull();
      expect(validatePseudo("PoketSecret")).not.toBeNull();
      expect(validatePseudo("PoketSecret_Officiel")).not.toBeNull();
      expect(validatePseudo("AdminStyle92")).not.toBeNull(); // en sous-chaîne aussi
    });

    it("n'est pas trop large : un nom légitime contenant un préfixe proche passe", () => {
      expect(validatePseudo("PoketFan")).toBeNull();
    });
  });

  describe("grossièreté (FR + EN, dictionnaire local)", () => {
    it("rejette un mot grossier français courant", () => {
      expect(validatePseudo("connard")).not.toBeNull();
      expect(validatePseudo("salope")).not.toBeNull();
    });

    it("rejette une variante leetspeak connue du dictionnaire", () => {
      expect(validatePseudo("c0nnard")).not.toBeNull();
      expect(validatePseudo("sal0pe")).not.toBeNull();
    });

    it("rejette un mot grossier anglais courant", () => {
      expect(validatePseudo("shit")).not.toBeNull();
    });

    it("ne bloque pas un mot anodin proche d'un mot grossier", () => {
      expect(validatePseudo("idiot")).toBeNull();
    });
  });
});
