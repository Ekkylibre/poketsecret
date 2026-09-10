import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();

vi.mock("@/lib/db", () => ({ sql: sqlMock }));

const { getFollowedAvailabilities, getUnreadNotificationCount, notificationDate } = await import(
  "./notifications"
);

beforeEach(() => {
  sqlMock.mockReset();
});

describe("notificationDate", () => {
  it("préfère la date de dernière modification quand elle existe", () => {
    expect(
      notificationDate({
        lastModifiedAt: "2024-02-01T00:00:00.000Z",
        reportedAt: "2024-01-01T00:00:00.000Z",
      } as unknown as Parameters<typeof notificationDate>[0])
    ).toBe("2024-02-01T00:00:00.000Z");
  });

  it("retombe sur la date de signalement sans modification", () => {
    expect(
      notificationDate({
        lastModifiedAt: undefined,
        reportedAt: "2024-01-01T00:00:00.000Z",
      } as unknown as Parameters<typeof notificationDate>[0])
    ).toBe("2024-01-01T00:00:00.000Z");
  });
});

/** Ligne brute complète telle que renvoyée par la requête de getFollowedAvailabilities
 *  (jointure disponibilites + produits + magasins), avec un `is_read` paramétrable. */
function rawRow(isRead: boolean) {
  return {
    id: "d1",
    produit_id: "p1",
    magasin_id: "s1",
    signale_par: "user-1",
    signale_le: new Date("2024-01-01T00:00:00Z"),
    derniere_confirmation_le: null,
    modifie_par: null,
    modifie_le: null,
    prix_centimes: 2500,
    langue: "FR",
    quantite: "1-5",
    photo_url: null,
    nature: "Nouveau",
    epingle: false,
    confiance_base: 100,
    nb_confirmations: 0,
    nb_contestations: 0,
    nb_signalements: 0,
    p_nom: "Dracaufeu",
    p_type: "display",
    p_serie: "Écarlate et Violet",
    p_extension: "151",
    p_image_url: null,
    m_nom: "Magasin Test",
    m_adresse: "1 rue Test",
    m_code_postal: "75001",
    m_ville: "Paris",
    m_latitude: 48.85,
    m_longitude: 2.35,
    m_telephone: null,
    m_horaires: null,
    m_cree_par: "user-2",
    m_cree_le: new Date("2023-01-01T00:00:00Z"),
    m_modifie_par: null,
    m_modifie_le: null,
    m_nb_jaime: 3,
    m_nb_signalements: 0,
    is_read: isRead,
  };
}

describe("getFollowedAvailabilities", () => {
  it("reconstruit availability/product/store/isRead depuis la ligne jointe", async () => {
    sqlMock.mockResolvedValue([rawRow(true)]);

    const [result] = await getFollowedAvailabilities("user-1");

    expect(result.availability).toMatchObject({ id: "d1", productId: "p1", storeId: "s1", price: 25 });
    expect(result.product).toMatchObject({ id: "p1", name: "Dracaufeu", setName: "151" });
    expect(result.store).toMatchObject({ id: "s1", name: "Magasin Test", city: "Paris" });
    expect(result.isRead).toBe(true);
  });

  it("passe la requête utilisateur en paramètre à la requête SQL", async () => {
    sqlMock.mockResolvedValue([]);

    await getFollowedAvailabilities("user-42");

    expect(sqlMock).toHaveBeenCalledWith(expect.anything(), "user-42", "user-42", "user-42");
  });
});

describe("getUnreadNotificationCount", () => {
  it("compte uniquement les notifications non lues", async () => {
    sqlMock.mockResolvedValue([rawRow(true), rawRow(false), rawRow(false)]);

    expect(await getUnreadNotificationCount("user-1")).toBe(2);
  });

  it("retourne 0 quand tout est lu ou qu'il n'y a rien à notifier", async () => {
    sqlMock.mockResolvedValue([rawRow(true)]);
    expect(await getUnreadNotificationCount("user-1")).toBe(0);

    sqlMock.mockResolvedValue([]);
    expect(await getUnreadNotificationCount("user-1")).toBe(0);
  });
});
