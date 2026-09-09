import { Lock, Shield, ShieldCheck, Trophy, type LucideIcon } from "lucide-react";

import { ReputationGauge } from "@/components/reputation-gauge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DAILY_LIMITS,
  MAGASIN_PAR_SEMAINE,
  REPUTATION_MAX,
  TIER_THRESHOLD_CONFIRME,
  TIER_THRESHOLD_FIABLE,
  tierOf,
  type Tier,
} from "@/lib/reputation-constants";
import { cn } from "@/lib/utils";

const TIERS: Tier[] = ["nouveau", "confirme", "fiable"];

const TIER_LABELS: Record<Tier, string> = {
  nouveau: "Nouveau",
  confirme: "Confirmé",
  fiable: "Fiable",
};

const TIER_MIN_REPUTATION: Record<Tier, number> = {
  nouveau: 0,
  confirme: TIER_THRESHOLD_CONFIRME,
  fiable: TIER_THRESHOLD_FIABLE,
};

const TIER_ICONS: Record<Tier, LucideIcon> = {
  nouveau: Shield,
  confirme: ShieldCheck,
  fiable: Trophy,
};

// Vert plutôt qu'ambre pour "Fiable" : l'ambre est déjà pris par le badge Premium plus
// bas sur la page, les deux ne doivent pas se confondre visuellement.
const TIER_COLORS: Record<Tier, string> = {
  nouveau: "text-muted-foreground",
  confirme: "text-blue-400",
  fiable: "text-emerald-400",
};

/** "X/Y" pour le palier actuel (compteur réel), juste la limite pour les autres (le
 *  compteur ne s'y applique pas encore). */
function formatCell(limit: number, used: number | undefined): string {
  if (limit === Infinity) return "Illimité";
  return used === undefined ? String(limit) : `${used}/${limit}`;
}

/** Explique le palier de réputation (nouveau/confirmé/fiable) : invisible ailleurs dans
 *  l'app, ces seuils ne vivaient jusqu'ici que côté serveur (quotas de votes/signalements
 *  dans lib/reputation.ts) sans que l'utilisateur puisse savoir où il en est ni ce qui
 *  l'attend en progressant, d'où le tableau des 3 paliers, pas juste l'actuel. */
export function ReputationCard({
  reputation,
  usage,
}: {
  reputation: number;
  /** Consommé aujourd'hui (votes/signalements/nouvellesAnnonces) et cette semaine
   *  (magasins) par l'utilisateur, affiché en "X/Y" sur la ligne de son palier actuel. */
  usage?: { votes: number; signalements: number; nouvellesAnnonces: number; magasins: number };
}) {
  const tier = tierOf(reputation);
  const Icon = TIER_ICONS[tier];

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 text-sm font-semibold", TIER_COLORS[tier])}>
          <Icon className="size-4" />
          Palier {TIER_LABELS[tier]}
        </div>
        <span className="text-muted-foreground text-xs">
          {reputation}/{REPUTATION_MAX}
        </span>
      </div>

      <div>
        <ReputationGauge reputation={reputation} />
        {/* Le nom de chaque palier aligné à gauche sur le repère où il démarre, les 3
            au même traitement (pas l'un centré et l'autre aligné à droite), sinon ça ne
            lit plus comme "ce nom marque le début de cette zone" de façon cohérente. */}
        <div className="relative mt-1 h-3.5">
          {TIERS.map((t) => (
            <span
              key={t}
              className="text-muted-foreground absolute text-[10px] whitespace-nowrap"
              style={{ left: `${(TIER_MIN_REPUTATION[t] / REPUTATION_MAX) * 100}%` }}
            >
              {TIER_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-muted-foreground border-b text-[10px]">
              <th className="py-1 text-left font-medium">Palier</th>
              <th className="py-1 text-center font-medium">Votes/j</th>
              <th className="py-1 text-center font-medium">Signal/j</th>
              <th className="py-1 text-center font-medium">Annonces/j</th>
              <th className="py-1 text-center font-medium">Magasins/sem</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => {
              const reached = reputation >= TIER_MIN_REPUTATION[t];
              const isCurrent = t === tier;
              const TierIcon = TIER_ICONS[t];
              const limits = DAILY_LIMITS[t];
              return (
                <tr key={t} className={cn("border-b last:border-0", isCurrent && "bg-muted")}>
                  <td className="py-1.5 pl-1">
                    <div className="flex items-center gap-1.5">
                      {reached ? (
                        <TierIcon className={cn("size-3.5 shrink-0", TIER_COLORS[t])} />
                      ) : (
                        <Lock className="text-muted-foreground/50 size-3.5 shrink-0" />
                      )}
                      <span className={cn("font-medium", !reached && "text-muted-foreground/60")}>
                        {TIER_LABELS[t]}
                      </span>
                      {isCurrent && (
                        <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                          Actuel
                        </Badge>
                      )}
                    </div>
                    {!reached && (
                      <p className="text-muted-foreground/50 pl-5 text-[10px]">
                        dès {TIER_MIN_REPUTATION[t]} pts
                      </p>
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-center tabular-nums",
                      !reached && "text-muted-foreground/40"
                    )}
                  >
                    {formatCell(limits.votes, isCurrent ? usage?.votes : undefined)}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-center tabular-nums",
                      !reached && "text-muted-foreground/40"
                    )}
                  >
                    {formatCell(limits.signalements, isCurrent ? usage?.signalements : undefined)}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-center tabular-nums",
                      !reached && "text-muted-foreground/40"
                    )}
                  >
                    {formatCell(limits.nouvellesAnnonces, isCurrent ? usage?.nouvellesAnnonces : undefined)}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 pr-1 text-center tabular-nums",
                      !reached && "text-muted-foreground/40"
                    )}
                  >
                    {formatCell(MAGASIN_PAR_SEMAINE[t], isCurrent ? usage?.magasins : undefined)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
