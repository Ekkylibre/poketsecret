"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/require-session";
import { sql } from "@/lib/db";
import { ensureProfil } from "@/lib/profil";

export async function dismissNotification(availabilityId: string) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  await sql`
    insert into public.notifications_etat (utilisateur_id, disponibilite_id, masquee)
    values (${user.id}, ${availabilityId}, true)
    on conflict (utilisateur_id, disponibilite_id) do update set masquee = true
  `;
  revalidatePath("/notifications");
  // Revalide aussi le layout des onglets : la pastille de non-lus sur BottomNav y est
  // calculée, sinon elle resterait figée tant qu'on ne change pas d'onglet.
  revalidatePath("/notifications", "layout");
  return { success: true };
}

export async function dismissAllNotifications(availabilityIds: string[]) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  for (const id of availabilityIds) {
    await sql`
      insert into public.notifications_etat (utilisateur_id, disponibilite_id, masquee)
      values (${user.id}, ${id}, true)
      on conflict (utilisateur_id, disponibilite_id) do update set masquee = true
    `;
  }
  revalidatePath("/notifications");
  revalidatePath("/notifications", "layout");
  return { success: true };
}

/** Marque des notifications comme vues, déclenché à l'ouverture de l'onglet (cf.
 *  notifications-list.tsx), jamais par le clic sur une notification qui, lui, ouvre le
 *  magasin : les deux interactions ne doivent pas se marcher dessus. Pas de
 *  requireSession() (pas de redirect) : sans session réelle il n'y a simplement rien à
 *  marquer, pas une erreur. */
export async function markNotificationsRead(availabilityIds: string[]) {
  const { data: session } = await auth.getSession();
  if (!session?.user || availabilityIds.length === 0) return { success: true };
  await ensureProfil(session.user.id, session.user.name);

  for (const id of availabilityIds) {
    await sql`
      insert into public.notifications_etat (utilisateur_id, disponibilite_id, lue)
      values (${session.user.id}, ${id}, true)
      on conflict (utilisateur_id, disponibilite_id) do update set lue = true
    `;
  }
  revalidatePath("/notifications");
  revalidatePath("/notifications", "layout");
  return { success: true };
}
