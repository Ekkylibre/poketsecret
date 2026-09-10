import { beforeEach, describe, expect, it, vi } from "vitest";

// lib/reputation.ts ne fait que construire des requêtes SQL et lire leur résultat : on
// simule le client `sql` en reconnaissant chaque requête à un mot-clé distinctif de son
// texte, plutôt que de dépendre de l'ordre exact des appels — un futur refactor qui
// changerait cet ordre (sans changer le comportement) ne casserait pas ces tests.
type SqlMock = ReturnType<typeof vi.fn> & { transaction: ReturnType<typeof vi.fn> };

function createSqlMock(): SqlMock {
  const fn = vi.fn() as unknown as SqlMock;
  fn.transaction = vi.fn().mockResolvedValue(undefined);
  return fn;
}

const sqlMock = createSqlMock();

vi.mock("@/lib/db", () => ({ sql: sqlMock }));

// Import après le mock (vi.mock est hissé au sommet du fichier par Vitest, donc l'ordre
// d'écriture n'a pas d'importance, mais autant rester explicite).
const { resolveDisponibiliteVote, resolveMagasinVote } = await import("./reputation");

interface DispoCteRow {
  resolution: "confirmee" | "invalidee" | null;
  masquee: boolean;
  auteur_id: string | null;
  score_dispute: number;
  votants_dispute: number;
}

interface SignalementRow {
  motif: string;
  score: number;
  votants: number;
}

/** Configure les réponses des 2 lectures de resolveDisponibiliteVote, quel que soit
 *  l'ordre réel des requêtes SQL sous-jacentes. */
function mockDispoQueries(cteRow: DispoCteRow, signalements: SignalementRow[] = []) {
  sqlMock.mockImplementation((strings: TemplateStringsArray) => {
    const text = strings.join(" ");
    if (text.includes("votes_pertinents")) return Promise.resolve([cteRow]);
    if (text.includes("signalements_pertinents")) return Promise.resolve(signalements);
    return Promise.resolve([]); // UPDATE/INSERT : résultat jamais lu par l'appelant.
  });
}

beforeEach(() => {
  sqlMock.mockReset();
  sqlMock.transaction.mockReset().mockResolvedValue(undefined);
});

describe("resolveDisponibiliteVote", () => {
  const AUTEUR_ID = "auteur-1";
  const DISPO_ID = "dispo-1";

  it("ne change rien tant qu'il n'y a pas assez de votants (< 3)", async () => {
    mockDispoQueries({
      resolution: null,
      masquee: false,
      auteur_id: AUTEUR_ID,
      score_dispute: 5, // score élevé, mais...
      votants_dispute: 2, // ...pas assez de votants pour compter.
    });

    await resolveDisponibiliteVote(DISPO_ID);

    expect(sqlMock.transaction).not.toHaveBeenCalled();
  });

  it("confirme la dispo et crédite +1 à l'auteur quand le score dépasse le seuil de confirmation", async () => {
    mockDispoQueries({
      resolution: null,
      masquee: false,
      auteur_id: AUTEUR_ID,
      score_dispute: 3,
      votants_dispute: 3,
    });

    await resolveDisponibiliteVote(DISPO_ID);

    expect(sqlMock.transaction).toHaveBeenCalledTimes(1);
    const statements = sqlMock.transaction.mock.calls[0][0];
    // 1 update disponibilites + (1 update profil + 1 insert evenement) pour le +1.
    expect(statements).toHaveLength(3);
  });

  it("invalide la dispo, la masque, et retire 2 points à l'auteur quand le score s'effondre", async () => {
    mockDispoQueries({
      resolution: null,
      masquee: false,
      auteur_id: AUTEUR_ID,
      score_dispute: -3,
      votants_dispute: 3,
    });

    await resolveDisponibiliteVote(DISPO_ID);

    expect(sqlMock.transaction).toHaveBeenCalledTimes(1);
    expect(sqlMock.transaction.mock.calls[0][0]).toHaveLength(3);
  });

  it("hystérésis : redémasque seulement en repassant au-dessus de 0, pas juste au-dessus du seuil de masquage", async () => {
    mockDispoQueries({
      resolution: "invalidee",
      masquee: true,
      auteur_id: AUTEUR_ID,
      score_dispute: -2, // au-dessus du seuil de masquage (-3) mais toujours négatif.
      votants_dispute: 3,
    });

    await resolveDisponibiliteVote(DISPO_ID);

    // Toujours en dessous de 0 : la résolution "invalidee" (et donc le masquage) reste en place.
    expect(sqlMock.transaction).not.toHaveBeenCalled();
  });

  it("reprend le +1 déjà accordé quand une confirmation repasse neutre", async () => {
    mockDispoQueries({
      resolution: "confirmee",
      masquee: false,
      auteur_id: AUTEUR_ID,
      score_dispute: 1, // repassé sous le seuil de confirmation, mais >= 0.
      votants_dispute: 3,
    });

    await resolveDisponibiliteVote(DISPO_ID);

    expect(sqlMock.transaction).toHaveBeenCalledTimes(1);
    expect(sqlMock.transaction.mock.calls[0][0]).toHaveLength(3);
  });

  it("masque une dispo sur signalements seuls, même sans changement de résolution", async () => {
    mockDispoQueries(
      { resolution: null, masquee: false, auteur_id: AUTEUR_ID, score_dispute: 0, votants_dispute: 0 },
      [{ motif: "inapproprie", score: -2, votants: 2 }]
    );

    await resolveDisponibiliteVote(DISPO_ID);

    expect(sqlMock.transaction).toHaveBeenCalledTimes(1);
    // Un seul update (masquee) : la résolution n'a pas changé, donc pas de delta de réputation.
    expect(sqlMock.transaction.mock.calls[0][0]).toHaveLength(1);
  });

  it("ne fait rien si la dispo n'existe plus", async () => {
    sqlMock.mockResolvedValue([]);

    await resolveDisponibiliteVote("dispo-inexistante");

    expect(sqlMock.transaction).not.toHaveBeenCalled();
  });
});

describe("resolveMagasinVote", () => {
  const MAGASIN_ID = "magasin-1";

  function mockMagasinQueries(
    base: { auteur_id: string | null; masque: boolean },
    score: { score: number; votants: number }
  ) {
    sqlMock.mockImplementation((strings: TemplateStringsArray) => {
      const text = strings.join(" ");
      if (text.includes("votes_pertinents")) return Promise.resolve([score]);
      if (text.includes("cree_par as auteur_id, masque")) return Promise.resolve([base]);
      return Promise.resolve([]); // UPDATE masque.
    });
  }

  it("masque le magasin quand le seuil de signalement est atteint", async () => {
    mockMagasinQueries({ auteur_id: "createur-1", masque: false }, { score: -5, votants: 5 });

    await resolveMagasinVote(MAGASIN_ID);

    expect(sqlMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("update public.magasins set masque")]),
      true,
      MAGASIN_ID
    );
  });

  it("ne masque pas si le nombre de votants est insuffisant, même avec un mauvais score", async () => {
    mockMagasinQueries({ auteur_id: "createur-1", masque: false }, { score: -10, votants: 2 });

    await resolveMagasinVote(MAGASIN_ID);

    expect(sqlMock).not.toHaveBeenCalledWith(expect.anything(), true, MAGASIN_ID);
  });

  it("redémasque un magasin déjà masqué une fois le score revenu à 0 ou plus", async () => {
    mockMagasinQueries({ auteur_id: "createur-1", masque: true }, { score: 0, votants: 1 });

    await resolveMagasinVote(MAGASIN_ID);

    expect(sqlMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("update public.magasins set masque")]),
      false,
      MAGASIN_ID
    );
  });

  it("ne fait rien si le magasin n'existe plus", async () => {
    sqlMock.mockResolvedValue([]);

    await resolveMagasinVote("magasin-inexistant");

    // Un seul appel (la lecture initiale) : ni le calcul de score ni l'update n'ont lieu.
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});
