import type { Tier } from "@/lib/reputation-constants";
import { TIER_COLORS, TIER_ICONS, TIER_LABELS } from "@/lib/tier-display";
import { cn } from "@/lib/utils";

/** Icône de palier à côté d'un pseudo auteur. Rien pour "nouveau" (état neutre par
 *  défaut) : un badge sur chaque annonce d'un compte tout neuf le désignerait comme
 *  "pas encore fiable" par défaut, ce qui décourage justement les nouveaux arrivants de
 *  contribuer. Seuls confirmé/fiable sont un signal positif à afficher. */
export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  if (tier === "nouveau") return null;
  const Icon = TIER_ICONS[tier];
  return (
    <span title={`Palier ${TIER_LABELS[tier]}`} className="inline-flex shrink-0">
      <Icon className={cn("size-3", TIER_COLORS[tier], className)} aria-hidden="true" />
    </span>
  );
}
