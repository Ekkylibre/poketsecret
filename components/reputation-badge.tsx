import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function ReputationBadge({ reputation }: { reputation: number }) {
  return (
    <Badge variant="secondary">
      <Star className="fill-current" />
      {reputation}
    </Badge>
  );
}
