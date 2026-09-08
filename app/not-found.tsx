import { Compass } from "lucide-react";
import Link from "next/link";

import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="bg-muted flex size-16 items-center justify-center rounded-full">
          <Compass className="text-muted-foreground size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Page introuvable</h1>
          <p className="text-muted-foreground text-sm">
            Cette page n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
      <BottomNav />
    </>
  );
}
