"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/require-session";
import { mockCurrentUser } from "@/lib/mock-data";

export async function dismissNotification(availabilityId: string) {
  await requireSession();

  if (!mockCurrentUser.dismissedNotificationIds.includes(availabilityId)) {
    mockCurrentUser.dismissedNotificationIds.push(availabilityId);
  }
  revalidatePath("/notifications");
  // Revalide aussi le layout des onglets : la pastille de non-lus sur BottomNav y est
  // calculée, sinon elle resterait figée tant qu'on ne change pas d'onglet.
  revalidatePath("/notifications", "layout");
  return { success: true };
}

export async function dismissAllNotifications(availabilityIds: string[]) {
  await requireSession();

  for (const id of availabilityIds) {
    if (!mockCurrentUser.dismissedNotificationIds.includes(id)) {
      mockCurrentUser.dismissedNotificationIds.push(id);
    }
  }
  revalidatePath("/notifications");
  // Revalide aussi le layout des onglets : la pastille de non-lus sur BottomNav y est
  // calculée, sinon elle resterait figée tant qu'on ne change pas d'onglet.
  revalidatePath("/notifications", "layout");
  return { success: true };
}

/** Marque des notifications comme vues — déclenché à l'ouverture de l'onglet (cf.
 *  notifications-list.tsx), jamais par le clic sur une notification qui, lui, ouvre le
 *  magasin : les deux interactions ne doivent pas se marcher dessus. */
export async function markNotificationsRead(availabilityIds: string[]) {
  for (const id of availabilityIds) {
    if (!mockCurrentUser.readNotificationIds.includes(id)) {
      mockCurrentUser.readNotificationIds.push(id);
    }
  }
  revalidatePath("/notifications");
  // Revalide aussi le layout des onglets : la pastille de non-lus sur BottomNav y est
  // calculée, sinon elle resterait figée tant qu'on ne change pas d'onglet.
  revalidatePath("/notifications", "layout");
  return { success: true };
}
