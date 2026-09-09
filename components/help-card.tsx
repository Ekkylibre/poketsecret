"use client";

import {
  Bell,
  Camera,
  ChevronDown,
  CircleHelp,
  Flag,
  ThumbsUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECTIONS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Bell,
    title: "Suivre un produit ou un magasin",
    body: "Suivre un produit te notifie dès qu'il est signalé quelque part, n'importe où. Suivre un magasin te notifie de tout nouveau produit qui y apparaît après le début de ton suivi, pas de tout son stock déjà existant.",
  },
  {
    icon: ThumbsUp,
    title: "Liker / disliker",
    body: "Chaque annonce peut être confirmée ou contestée par la communauté. Ton vote pèse selon ta réputation : plus elle est haute, plus il compte. En dessous d'un certain score, l'annonce est masquée (avec un badge), mais reste votable pour permettre un retour en arrière si le score remonte.",
  },
  {
    icon: Flag,
    title: "Signaler",
    body: "Pour une photo ou un produit incorrect, un doublon, ou un contenu inapproprié. Signaler à tort de façon répétée fait baisser ta réputation, tout comme se faire signaler à raison sur tes propres annonces.",
  },
  {
    icon: Trophy,
    title: "Réputation et paliers",
    body: "Ta réputation évolue selon la fiabilité de tes contributions (annonces confirmées, votes justes...). Elle détermine ton palier (Nouveau, Confirmé, Fiable) et tes limites quotidiennes/hebdomadaires, résumées dans le tableau ci-dessus.",
  },
  {
    icon: Camera,
    title: "Règles de publication",
    body: "Photo prise par toi, à l'instant, dans le magasin (pas une image trouvée en ligne). Infos vérifiées : prix, quantité. Déjà référencé ? Confirme l'annonce existante plutôt que d'en recréer une. Une erreur ? Tu peux toujours revenir la corriger.",
  },
];

/** Pliée par défaut : contenu de référence consulté ponctuellement, pas à chaque visite
 *  du profil, donc pas besoin de prendre de la place en permanence. */
export function HelpCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="gap-0 p-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <CircleHelp className="size-4" />
          Aide et règles
        </span>
        <ChevronDown className={cn("text-muted-foreground size-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="flex gap-2">
              <s.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-muted-foreground text-xs">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
