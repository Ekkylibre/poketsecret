import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

/**
 * À appeler en tête de toute action d'écriture (ajouter/modifier un magasin ou un
 * produit, suivre, voter, signaler...) : redirige vers la connexion si personne n'est
 * vraiment connecté. L'aperçu dev ("Aperçu connecté" sur /profil) ne compte pas ici :
 * une action d'écriture a besoin d'une vraie identité à qui l'attribuer, la navigation
 * en lecture seule reste elle ouverte à tous.
 *
 * Corrige aussi une faille trouvée lors d'un audit de sécurité : Neon Auth (config
 * require_email_verification: false, non modifiable via les outils MCP disponibles) ne
 * bloque pas la connexion d'un compte dont l'email n'a jamais été confirmé — reproduit
 * en conditions réelles (compte créé, OTP jamais complété, connexion réussie quand
 * même). Un compte non vérifié peut donc obtenir une session, mais est redirigé ici
 * avant toute écriture plutôt que de pouvoir agir sous un email qu'il ne contrôle
 * peut-être pas.
 */
export async function requireSession() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  if (!session.user.emailVerified) {
    redirect("/auth/verify-email");
  }
  return session.user;
}
