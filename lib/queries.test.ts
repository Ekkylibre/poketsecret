import { beforeEach, describe, expect, it, vi } from "vitest";

// Ces fonctions ne font que traduire des lignes SQL (snake_case, valeurs nullables) en
// objets du domaine (camelCase, undefined plutôt que null) : le risque principal est une
// erreur de mapping (mauvaise colonne, oubli d'un ?? undefined), pas une erreur de
// requête SQL elle-même. On simule donc `sql` pour ne tester que ce mapping.
const sqlMock = vi.fn();

vi.mock("@/lib/db", () => ({ sql: sqlMock }));

const { fetchAuthorPseudos, fetchAvailabilities, fetchFollowState, fetchProducts, fetchStores } =
  await import("./queries");

beforeEach(() => {
  sqlMock.mockReset();
});

describe("fetchStores", () => {
  it("convertit une ligne complète en Store", async () => {
    sqlMock.mockResolvedValue([
      {
        id: "store-1",
        nom: "Magasin Test",
        adresse: "1 rue Test",
        code_postal: "75001",
        ville: "Paris",
        latitude: 48.85,
        longitude: 2.35,
        telephone: "0102030405",
        horaires: { lundi: { open: "09:00", close: "19:00" } },
        cree_par: "user-1",
        cree_le: new Date("2024-01-01T00:00:00Z"),
        modifie_par: "user-2",
        modifie_le: new Date("2024-02-01T00:00:00Z"),
        nb_jaime: 5,
        nb_signalements: 2,
        masque: false,
      },
    ]);

    const [store] = await fetchStores();

    expect(store).toEqual({
      id: "store-1",
      name: "Magasin Test",
      address: "1 rue Test",
      postalCode: "75001",
      city: "Paris",
      lat: 48.85,
      lng: 2.35,
      phone: "0102030405",
      hours: { lundi: { open: "09:00", close: "19:00" } },
      createdById: "user-1",
      createdAt: "2024-01-01T00:00:00.000Z",
      lastModifiedById: "user-2",
      lastModifiedAt: "2024-02-01T00:00:00.000Z",
      likes: 5,
      reports: 2,
      flags: 2,
      masked: false,
    });
  });

  it("remplace les colonnes nullables par undefined (jamais null)", async () => {
    sqlMock.mockResolvedValue([
      {
        id: "store-2",
        nom: "Sans infos",
        adresse: "2 rue Test",
        code_postal: null,
        ville: "Lyon",
        latitude: 45.75,
        longitude: 4.85,
        telephone: null,
        horaires: null,
        cree_par: null,
        cree_le: new Date("2024-01-01T00:00:00Z"),
        modifie_par: null,
        modifie_le: null,
        nb_jaime: 0,
        nb_signalements: 0,
        masque: false,
      },
    ]);

    const [store] = await fetchStores();

    expect(store.postalCode).toBeUndefined();
    expect(store.phone).toBeUndefined();
    expect(store.hours).toBeUndefined();
    expect(store.createdById).toBe(""); // pas de fallback à undefined ici, un id vide
    expect(store.lastModifiedById).toBeUndefined();
    expect(store.lastModifiedAt).toBeUndefined();
  });
});

describe("fetchProducts", () => {
  it("convertit une ligne en Product, avec série vide par défaut", async () => {
    sqlMock.mockResolvedValue([
      { id: "p1", nom: "Dracaufeu", type: "display", serie: null, extension: "151", image_url: null },
    ]);

    const [product] = await fetchProducts();

    expect(product).toEqual({
      id: "p1",
      name: "Dracaufeu",
      type: "display",
      series: "",
      setName: "151",
      imageUrl: undefined,
    });
  });
});

describe("fetchAvailabilities", () => {
  it("convertit les centimes en euros quand le prix est renseigné", async () => {
    sqlMock.mockResolvedValue([
      {
        id: "d1",
        produit_id: "p1",
        magasin_id: "s1",
        signale_par: "user-1",
        signale_le: new Date("2024-01-01T00:00:00Z"),
        derniere_confirmation_le: null,
        modifie_par: null,
        modifie_le: null,
        prix_centimes: 4999,
        langue: "FR",
        quantite: "5-10",
        photo_url: null,
        nature: "Nouveau",
        epingle: false,
        confiance_base: 100,
        nb_confirmations: 0,
        nb_contestations: 0,
        nb_signalements: 0,
        masquee: false,
      },
    ]);

    const [availability] = await fetchAvailabilities();

    expect(availability.price).toBe(49.99);
    expect(availability.reportedById).toBe("user-1");
    expect(availability.masked).toBe(false);
  });

  it("laisse le prix undefined quand il n'est pas renseigné", async () => {
    sqlMock.mockResolvedValue([
      {
        id: "d2",
        produit_id: "p1",
        magasin_id: "s1",
        signale_par: null,
        signale_le: new Date("2024-01-01T00:00:00Z"),
        derniere_confirmation_le: null,
        modifie_par: null,
        modifie_le: null,
        prix_centimes: null,
        langue: null,
        quantite: null,
        photo_url: null,
        nature: null,
        epingle: false,
        confiance_base: 100,
        nb_confirmations: 0,
        nb_contestations: 0,
        nb_signalements: 0,
        masquee: false,
      },
    ]);

    const [availability] = await fetchAvailabilities();

    expect(availability.price).toBeUndefined();
    expect(availability.reportedById).toBe(""); // auteur anonyme/supprimé plutôt qu'un plantage
  });
});

describe("fetchAuthorPseudos", () => {
  it("construit un dictionnaire id -> pseudo", async () => {
    sqlMock.mockResolvedValue([
      { id: "u1", pseudo: "Sacha" },
      { id: "u2", pseudo: "Ondine" },
    ]);

    expect(await fetchAuthorPseudos()).toEqual({ u1: "Sacha", u2: "Ondine" });
  });

  it("retourne un objet vide sans utilisateur", async () => {
    sqlMock.mockResolvedValue([]);
    expect(await fetchAuthorPseudos()).toEqual({});
  });
});

describe("fetchFollowState", () => {
  it("regroupe les 3 listes de suivi par table d'origine, pas par ordre d'appel", async () => {
    sqlMock.mockImplementation((strings: TemplateStringsArray) => {
      const text = strings.join(" ");
      if (text.includes("magasins_epingles")) return Promise.resolve([{ magasin_id: "s1" }]);
      if (text.includes("magasins_suivis")) return Promise.resolve([{ magasin_id: "s2" }]);
      if (text.includes("produits_suivis")) return Promise.resolve([{ produit_id: "p1" }]);
      throw new Error(`requête inattendue: ${text}`);
    });

    expect(await fetchFollowState("user-1")).toEqual({
      pinnedStoreIds: ["s1"],
      followedStoreIds: ["s2"],
      followedProductIds: ["p1"],
    });
  });
});
