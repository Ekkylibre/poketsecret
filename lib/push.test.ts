import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();

vi.mock("@/lib/db", () => ({ sql: sqlMock }));
// web-push exige de vraies clés VAPID à l'import (setVapidDetails) : on simule tout le
// module pour ne pas dépendre de process.env en environnement de test.
vi.mock("web-push", () => ({
  default: { setVapidDetails: setVapidDetailsMock, sendNotification: sendNotificationMock },
}));

const { notifyFollowersOfNewDisponibilite, sendPushToUser } = await import("./push");

beforeEach(() => {
  sqlMock.mockReset();
  sendNotificationMock.mockReset();
});

describe("sendPushToUser", () => {
  const SUB = { id: "sub-1", endpoint: "https://push.example/1", p256dh: "key1", auth: "auth1" };

  it("envoie une notification à chaque abonnement de l'utilisateur", async () => {
    sqlMock.mockResolvedValue([SUB]);
    sendNotificationMock.mockResolvedValue(undefined);

    await sendPushToUser("user-1", { title: "Titre", body: "Corps" });

    expect(sendNotificationMock).toHaveBeenCalledWith(
      { endpoint: SUB.endpoint, keys: { p256dh: SUB.p256dh, auth: SUB.auth } },
      JSON.stringify({ title: "Titre", body: "Corps" })
    );
  });

  it("supprime l'abonnement en base quand il est expiré (410)", async () => {
    sqlMock.mockResolvedValueOnce([SUB]); // lecture des abonnements
    sendNotificationMock.mockRejectedValue({ statusCode: 410 });

    await sendPushToUser("user-1", { title: "Titre", body: "Corps" });

    expect(sqlMock).toHaveBeenCalledTimes(2); // lecture + suppression
    expect(sqlMock.mock.calls[1][0].join(" ")).toContain("delete from public.push_subscriptions");
  });

  it("n'efface pas l'abonnement sur une erreur non liée à son expiration", async () => {
    sqlMock.mockResolvedValueOnce([SUB]);
    sendNotificationMock.mockRejectedValue({ statusCode: 500 });

    await sendPushToUser("user-1", { title: "Titre", body: "Corps" });

    expect(sqlMock).toHaveBeenCalledTimes(1); // pas de 2e appel (suppression)
  });

  it("ne fait rien sans abonnement", async () => {
    sqlMock.mockResolvedValue([]);

    await sendPushToUser("user-sans-abo", { title: "Titre", body: "Corps" });

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});

describe("notifyFollowersOfNewDisponibilite", () => {
  function mockQueries(opts: {
    context?: { produit_nom: string; extension: string; magasin_nom: string };
    produitFollowers?: { utilisateur_id: string }[];
    storeFollowers?: { utilisateur_id: string }[];
    subscriptionsByUser?: Record<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>;
  }) {
    sqlMock.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join(" ");
      if (text.includes("produit_nom")) return Promise.resolve(opts.context ? [opts.context] : []);
      if (text.includes("produits_suivis")) return Promise.resolve(opts.produitFollowers ?? []);
      if (text.includes("magasins_suivis")) return Promise.resolve(opts.storeFollowers ?? []);
      if (text.includes("push_subscriptions")) {
        const userId = values[0] as string;
        return Promise.resolve(opts.subscriptionsByUser?.[userId] ?? []);
      }
      throw new Error(`requête inattendue: ${text}`);
    });
  }

  it("ne notifie personne si la dispo n'existe plus (contexte introuvable)", async () => {
    mockQueries({ context: undefined, produitFollowers: [{ utilisateur_id: "u1" }] });

    await notifyFollowersOfNewDisponibilite("d1", "p1", "s1", "author-1", "FR");

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("ne notifie personne sans aucun follower", async () => {
    mockQueries({ context: { produit_nom: "Dracaufeu", extension: "151", magasin_nom: "Magasin Test" } });

    await notifyFollowersOfNewDisponibilite("d1", "p1", "s1", "author-1", "FR");

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("dédoublonne un utilisateur qui suit à la fois le produit et le magasin", async () => {
    mockQueries({
      context: { produit_nom: "Dracaufeu", extension: "151", magasin_nom: "Magasin Test" },
      produitFollowers: [{ utilisateur_id: "u1" }],
      storeFollowers: [{ utilisateur_id: "u1" }, { utilisateur_id: "u2" }],
      subscriptionsByUser: {
        u1: [{ id: "sub-u1", endpoint: "https://push.example/u1", p256dh: "k1", auth: "a1" }],
        u2: [{ id: "sub-u2", endpoint: "https://push.example/u2", p256dh: "k2", auth: "a2" }],
      },
    });
    sendNotificationMock.mockResolvedValue(undefined);

    await notifyFollowersOfNewDisponibilite("d1", "p1", "s1", "author-1", "FR");

    // 1 envoi par utilisateur unique (u1 apparaît dans les deux listes, mais une seule fois).
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://push.example/u1" }),
      JSON.stringify({
        title: "Dracaufeu 151 disponible !",
        body: "Repéré chez Magasin Test",
        url: "/magasins?store=s1&dispo=d1",
      })
    );
  });
});
