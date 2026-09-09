import { sql } from "@/lib/db";

/**
 * Garantit qu'une ligne `profils_utilisateurs` existe pour cet utilisateur avant de la
 * modifier. Nécessaire car seule l'inscription email/mot de passe en crée une (voir
 * app/(tabs)/auth/sign-up/actions.ts) : un compte connecté via Google n'en a jamais,
 * donc toute mise à jour (Premium, etc.) sur ce genre de compte ne touchait aucune
 * ligne (no-op silencieux) avant l'ajout de cette fonction.
 */
export async function ensureProfil(userId: string, fallbackName?: string | null) {
  const pseudo = fallbackName?.trim() || `joueur_${userId.slice(0, 8)}`;
  await sql`
    insert into public.profils_utilisateurs (id, pseudo)
    values (${userId}, ${pseudo})
    on conflict (id) do nothing
  `;
}
