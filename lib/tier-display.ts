import { Shield, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";

import type { Tier } from "@/lib/reputation-constants";

// Centralisé ici plutôt que dupliqué dans chaque composant qui affiche un palier
// (ReputationCard, TierBadge) : même icône/couleur/libellé partout dans l'app.
export const TIER_LABELS: Record<Tier, string> = {
  nouveau: "Nouveau",
  confirme: "Confirmé",
  fiable: "Fiable",
};

export const TIER_ICONS: Record<Tier, LucideIcon> = {
  nouveau: Shield,
  confirme: ShieldCheck,
  fiable: Trophy,
};

// Vert plutôt qu'ambre pour "Fiable" : l'ambre est déjà pris par le badge Premium sur le
// profil, les deux ne doivent pas se confondre visuellement.
export const TIER_COLORS: Record<Tier, string> = {
  nouveau: "text-muted-foreground",
  confirme: "text-blue-400",
  fiable: "text-emerald-400",
};
