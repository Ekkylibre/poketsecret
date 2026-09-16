import type { Metadata } from "next";
import Link from "next/link";

import { InstallGuide } from "@/components/install-guide";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Installer PoketSecret",
};

// Hors du groupe (tabs) : page d'atterrissage du QR code de partage, pas un onglet de
// l'app (pas de BottomNav, pas besoin de session).
export default function InstallerPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo className="size-14" />
        <p className="text-base font-semibold tracking-tight">
          Poket<span className="text-[#f2a93c]">Secret</span>
        </p>
      </div>

      <Card className="w-full max-w-sm gap-5 p-5">
        <div>
          <h1 className="text-lg font-semibold">Installer l&apos;app</h1>
          <p className="text-muted-foreground text-sm">
            Ajoute PoketSecret à ton écran d&apos;accueil pour l&apos;ouvrir comme une vraie
            application, sans passer par le navigateur.
          </p>
        </div>

        <InstallGuide />

        <Link
          href="/"
          className="text-muted-foreground text-center text-sm underline underline-offset-2"
        >
          Continuer sans installer
        </Link>
      </Card>
    </div>
  );
}
