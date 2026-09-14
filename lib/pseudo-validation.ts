import leoProfanity from "leo-profanity";

// Chargé une fois au démarrage du process, pas à chaque appel : loadDictionary()
// remplace la liste active, donc on charge le FR puis on fusionne l'EN par-dessus
// (un compte peut aussi taper une insulte anglaise). Entièrement local (dictionnaires
// npm `leo-profanity`/`french-badwords-list`), aucun appel réseau/tiers.
leoProfanity.loadDictionary("fr");
leoProfanity.add(leoProfanity.getDictionary("en"));

const PSEUDO_MIN_LENGTH = 3;
export const PSEUDO_MAX_LENGTH = 20;

// Évite qu'un compte cycle son pseudo en continu (pour brouiller les pistes, squatter des
// pseudos, ou revenir sur un pseudo tout juste refusé/repéré). Contourné volontairement
// pour un compte signalé qui corrige (voir changerPseudo) : rester bloqué en "Utilisateur
// signalé" pendant tout ce délai irait à l'encontre du but de pouvoir corriger.
export const PSEUDO_CHANGE_COOLDOWN_JOURS = 30;

// Lettres (accents FR compris), chiffres, espace, tiret, underscore uniquement :
// bloque au passage les caractères invisibles/homoglyphes Unicode qui servent à
// contourner un filtre de mots.
const PSEUDO_CHARSET = /^[\p{L}\p{N} _-]+$/u;

// Usurpation du compte officiel/staff (voir TierBadge, isAdminUser) : un axe distinct
// de la grossièreté, à mon avis au moins aussi important une fois qu'un badge admin
// existe dans l'app. Comparé sur une version compactée (accents/espaces/tirets retirés,
// minuscule) pour attraper "Poket_Secret", "P0ketSecret", etc., pas juste la forme exacte.
const RESERVED_NAMES = [
  "admin",
  "administrateur",
  "administrateurs",
  "moderateur",
  "moderateurs",
  "modo",
  "modos",
  "staff",
  "support",
  "official",
  "officiel",
  "officielle",
  "poketsecret",
];

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Renvoie un message d'erreur si le pseudo est invalide, `null` s'il est acceptable.
 *  Ne couvre que ce qu'un filtre automatique peut attraper (longueur, caractères,
 *  usurpation, grossièreté connue) — le reste (sous-entendus, contexte) reste du
 *  ressort du signalement communautaire une fois le compte créé. */
export function validatePseudo(pseudo: string): string | null {
  const trimmed = pseudo.trim();

  if (trimmed.length < PSEUDO_MIN_LENGTH) {
    return `Le pseudo doit faire au moins ${PSEUDO_MIN_LENGTH} caractères.`;
  }
  if (trimmed.length > PSEUDO_MAX_LENGTH) {
    return `Le pseudo doit faire au plus ${PSEUDO_MAX_LENGTH} caractères.`;
  }
  if (!PSEUDO_CHARSET.test(trimmed)) {
    return "Le pseudo ne peut contenir que des lettres, chiffres, espaces, tirets et underscores.";
  }

  const normalized = normalize(trimmed);
  if (RESERVED_NAMES.some((name) => normalized.includes(name))) {
    return "Ce pseudo n'est pas disponible.";
  }

  if (leoProfanity.check(trimmed)) {
    return "Ce pseudo n'est pas autorisé.";
  }

  return null;
}
