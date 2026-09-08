import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

/**
 * À appeler en tête de toute action d'écriture (ajouter/modifier un magasin ou un
 * produit, suivre, voter, signaler...) : redirige vers la connexion si personne n'est
 * vraiment connecté. L'aperçu dev ("Aperçu connecté" sur /profil) ne compte pas ici —
 * une action d'écriture a besoin d'une vraie identité à qui l'attribuer, la navigation
 * en lecture seule reste elle ouverte à tous.
 */
export async function requireSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  return session.user;
}
