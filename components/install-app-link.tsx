"use client";

import { Download } from "lucide-react";
import Link from "next/link";

import { useIsStandalone } from "@/components/install-guide";
import { Card } from "@/components/ui/card";

/** Masqué une fois l'app déjà sur l'écran d'accueil : inutile de réafficher le lien à
 *  quelqu'un qui l'a déjà installée. */
export function InstallAppLink() {
  const standalone = useIsStandalone();
  if (standalone) return null;

  return (
    <Link href="/installer">
      <Card className="flex-row items-center gap-3 px-4 py-3">
        <Download className="text-primary size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Installer l&apos;app</p>
          <p className="text-muted-foreground text-xs">Sur l&apos;écran d&apos;accueil, comme une vraie app.</p>
        </div>
      </Card>
    </Link>
  );
}
