import { Badge } from "@/components/ui/badge";
import { confidenceLabel } from "@/lib/confidence";
import { cn } from "@/lib/utils";

const styles: Record<ReturnType<typeof confidenceLabel>, string> = {
  Fiable: "bg-emerald-500/15 text-emerald-400",
  Incertain: "bg-amber-500/15 text-amber-400",
  "À vérifier": "bg-destructive/15 text-destructive",
};

export function ConfidenceBadge({
  confidence,
  stale,
  className,
}: {
  confidence: number;
  /** Voir isProbablyStale (lib/confidence.ts) : au-delà d'un certain âge sans
   *  confirmation, un pourcentage qui continue doucement de baisser (ex. "23%") ne dit
   *  jamais clairement "probablement épuisé" — un badge net à la place, plutôt qu'en plus. */
  stale?: boolean;
  className?: string;
}) {
  if (stale) {
    // Texte volontairement court (pas "Probablement épuisé" en toutes lettres) : ce
    // badge partage une ligne étroite avec les compteurs de votes et les icônes
    // d'action (signaler, modifier) dans une carte déjà compacte — un texte trop long
    // poussait ces icônes hors du cadre visible. Le "?" garde le ton d'inférence
    // (personne n'a confirmé depuis un moment, pas une certitude) malgré le raccourci.
    return (
      <Badge
        title="Probablement épuisé (personne ne l'a confirmé depuis un moment)"
        variant="outline"
        className={cn("bg-destructive/15 text-destructive border-transparent font-medium", className)}
      >
        Épuisé ?
      </Badge>
    );
  }

  const label = confidenceLabel(confidence);
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", styles[label], className)}>
      {confidence}%
    </Badge>
  );
}
