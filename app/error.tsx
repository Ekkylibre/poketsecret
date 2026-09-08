"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
          <TriangleAlert className="text-destructive size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Une erreur est survenue</h1>
          <p className="text-muted-foreground text-sm">
            Quelque chose s&apos;est mal passé. Réessaie, ou reviens à l&apos;accueil.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => reset()}>
            Réessayer
          </Button>
          <Button asChild>
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
