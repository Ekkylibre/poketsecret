import { describe, expect, it } from "vitest";

import { cn, formatStoreAddress } from "./utils";

describe("cn", () => {
  it("fusionne des classes simples", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("ignore les valeurs falsy (conditions non remplies)", () => {
    const active = false;
    expect(cn("btn", active && "btn-active")).toBe("btn");
  });

  it("résout les conflits Tailwind en gardant la dernière classe", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatStoreAddress", () => {
  it("inclut le code postal quand il est renseigné", () => {
    expect(
      formatStoreAddress({ address: "1 rue de la Paix", postalCode: "75001", city: "Paris" })
    ).toBe("1 rue de la Paix, 75001 Paris");
  });

  it("l'omet quand il est absent", () => {
    expect(formatStoreAddress({ address: "1 rue de la Paix", city: "Paris" })).toBe(
      "1 rue de la Paix, Paris"
    );
  });
});
