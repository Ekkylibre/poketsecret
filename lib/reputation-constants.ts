// Constantes pures uniquement, aucun import de lib/db : ce fichier doit pouvoir être
// importé aussi bien par des Server Components/actions que par des composants client
// (ex. reputation-gauge.tsx). lib/reputation.ts (fonctions qui touchent la base) importe
// ces mêmes constantes plutôt que de les redéfinir.

export const REPUTATION_MIN = 0;
export const REPUTATION_MAX = 100;
export const REPUTATION_START = 30;

export type Tier = "nouveau" | "confirme" | "fiable";

// Seuils nommés (plutôt que des littéraux dans tierOf) : réutilisés tels quels par
// ReputationCard pour afficher "encore X points avant le prochain palier". La réputation
// ne monte que d'une seule façon (voir resolveDisponibiliteVote) : quand d'autres
// utilisateurs confirment activement une de ses annonces, +1 point à la fois. Fiable
// (80) doit rester un vrai objectif rare/prestigieux ; Confirmé (40) reste proche du
// départ pour ne pas décourager sur une app encore jeune avec peu de votants actifs.
export const TIER_THRESHOLD_CONFIRME = 40;
export const TIER_THRESHOLD_FIABLE = 80;

export function tierOf(reputation: number): Tier {
  if (reputation < TIER_THRESHOLD_CONFIRME) return "nouveau";
  if (reputation < TIER_THRESHOLD_FIABLE) return "confirme";
  return "fiable";
}

// Aucun palier n'est "illimité", même Fiable : un compte piraté avec des droits
// illimités fait un dégât sans plafond. Les plafonds sont pensés comme des plafonds durs
// pour UNE personne très engagée (pas une marge confortable) : même Fiable ne doit pas
// dépasser ce qu'un contributeur assidu ferait honnêtement en une journée, sans quoi le
// coût d'un compte compromis grandit trop vite à l'échelle de centaines d'utilisateurs.
export const DAILY_LIMITS: Record<
  Tier,
  { votes: number; signalements: number; editsAutres: number; nouvellesAnnonces: number }
> = {
  // editsAutres : modifier l'annonce de quelqu'un d'autre (prix/quantité/nature),
  // réservé à Confirmé+ (voir enregistrerProduit) ; Nouveau reste à 0, il ne peut de
  // toute façon éditer que ses propres annonces.
  // nouvellesAnnonces : signaler un produit dans un magasin pour la première fois (pas
  // les fois suivantes : revoir un produit déjà signalé compte comme un vote de
  // confirmation, pas une nouvelle annonce). Progression plus douce que les autres
  // quotas (x2 par palier au lieu de x3-4) : le stock de "premières fois" possibles
  // reste limité même pour un compte très actif, chaque nouvelle annonce déclenchant en
  // plus désormais une notification push aux abonnés.
  nouveau: { votes: 3, signalements: 1, editsAutres: 0, nouvellesAnnonces: 5 },
  confirme: { votes: 10, signalements: 3, editsAutres: 10, nouvellesAnnonces: 10 },
  fiable: { votes: 25, signalements: 8, editsAutres: 30, nouvellesAnnonces: 20 },
};

export const MAGASIN_PAR_SEMAINE: Record<Tier, number> = {
  nouveau: 1,
  confirme: 3,
  fiable: 6,
};

/** Poids d'un vote = sa réputation normalisée, plancher à 0.1 (un compte tout neuf
 *  compte un peu, jamais zéro, sinon personne ne peut jamais démarrer). C'est ce qui
 *  rend le système robuste aux faux comptes : il en faut beaucoup, et déjà crédibles,
 *  pour peser autant que quelques comptes établis. */
export function voteWeight(reputation: number): number {
  return Math.max(0.1, reputation / 100);
}

export const THRESHOLDS = {
  dispute: { minVotants: 3, seuilMasquage: -3, seuilConfirmation: 3 },
  signalementDispoGeneral: { minVotants: 2, seuilMasquage: -3 },
  signalementDispoSpam: { minVotants: 2, seuilMasquage: -2 },
  signalementMagasin: { minVotants: 5, seuilMasquage: -5 },
} as const;

// Hystérésis : masqué au seuil négatif, redémasqué seulement en repassant au-dessus de
// 0 (pas juste au-dessus du seuil). Évite qu'un score qui oscille pile autour du seuil
// fasse apparaître/disparaître le contenu à chaque vote.
export const SEUIL_DEMASQUAGE = 0;

// Anti-collusion : un même votant ne pèse que sur UNE dispo d'un même auteur par
// fenêtre glissante, peu importe sur combien de dispos différentes il vote. Sans ça, 3
// comptes à réputation établie peuvent confirmer 40 dispos différentes du même auteur
// en quelques minutes (aucune limite ne portait sur "combien de fois ces 3 mêmes
// personnes comptent pour ce même auteur", seulement sur le nombre de votes/jour).
export const FENETRE_ANTI_COLLUSION_JOURS = 7;

export const REPUTATION_DELTA = { confirmee: 1, invalidee: -2 } as const;
