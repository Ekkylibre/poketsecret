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
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const label = confidenceLabel(confidence);
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", styles[label], className)}>
      {confidence}%
    </Badge>
  );
}
