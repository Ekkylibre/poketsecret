"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Header commun aux 3 pages légales (mentions/CGU/CGV). router.back() plutôt qu'un lien
 *  fixe vers /profil : ces pages sont aussi accessibles depuis l'inscription (avant
 *  d'avoir un compte), où /profil redirigerait vers la connexion au lieu de ramener à
 *  l'inscription. back() revient toujours à l'endroit d'où on vient réellement. */
export function LegalPageHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Retour"
        className="text-muted-foreground hover:bg-accent -ml-1 flex size-8 shrink-0 items-center justify-center rounded-md"
      >
        <ArrowLeft className="size-4" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
