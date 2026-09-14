import { Logo } from "@/components/logo";
import type { Tier } from "@/lib/reputation-constants";
import { TIER_COLORS, TIER_ICONS, TIER_LABELS } from "@/lib/tier-display";
import { cn } from "@/lib/utils";

/** Icône de palier à côté d'un pseudo auteur. Rien pour "nouveau" (état neutre par
 *  défaut) : un badge sur chaque annonce d'un compte tout neuf le désignerait comme
 *  "pas encore fiable" par défaut, ce qui décourage justement les nouveaux arrivants de
 *  contribuer. Seuls confirmé/fiable sont un signal positif à afficher.
 *  Le compte admin (voir lib/admin.ts, un seul, jamais un palier) affiche le logo de
 *  l'app à la place du palier réel — un signal distinct, pas juste "Fiable" en plus fort. */
export function TierBadge({
  tier,
  isAdmin,
  className,
}: {
  tier: Tier;
  isAdmin?: boolean;
  className?: string;
}) {
  if (isAdmin) {
    return (
      <span title="Compte officiel PoketSecret" className="inline-flex shrink-0">
        <Logo className={cn("size-3.5", className)} />
      </span>
    );
  }

  if (tier === "nouveau") return null;
  const Icon = TIER_ICONS[tier];
  return (
    <span title={`Palier ${TIER_LABELS[tier]}`} className="inline-flex shrink-0">
      <Icon className={cn("size-3", TIER_COLORS[tier], className)} aria-hidden="true" />
    </span>
  );
}
